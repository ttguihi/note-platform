'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateNote } from "@/app/actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import MdEditorLoader from "@/components/md-editor-loader";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import TagInput from "@/components/tag-input";
import CategoryInput from "@/components/category-input";
import { Input } from "@/components/ui/input";
import { Loader2, Cloud, ImagePlus, WifiOff, History } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { initDB } from "@/lib/indexeddb"; // 👈 P1
import { SyncManager } from "@/lib/sync-manager"; // 👈 P1
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

const formSchema = z.object({
    title: z.string().min(1, { message: "请输入笔记标题" }),
    category: z.string().regex(/^\S*$/, { message: "分类不能包含空格" }).optional(),
    tags: z.array(z.string()),
    content: z.string().min(1, { message: "内容不能为空" }),
});

interface EditNoteFormProps {
    note: {
        id: string;
        title: string;
        content: string;
        category: string | null;
        tags: { name: string }[];
        updatedAt: Date; // 增加时间戳用于对比
    };
    existingCategories: string[];
}

// LocalStorage 辅助函数
const getDraftKey = (noteId: string) => `note-draft-${noteId}`;
const clearLocalDraft = (noteId: string) => {
    try { if (typeof window !== 'undefined') localStorage.removeItem(getDraftKey(noteId)); } catch (e) { }
};

export default function EditNoteForm({ note, existingCategories }: EditNoteFormProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isSuccess, setIsSuccess] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // 保存状态：saved(已同步), saving(保存中), error(失败), offline-saved(已存本地)
    const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error" | "offline-saved">("saved");
    const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    const formMethods = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: note.title,
            category: note.category ?? "",
            tags: note.tags.map(t => t.name),
            content: note.content,
        },
    });

    const { watch, control, handleSubmit, formState, setValue, getValues, reset } = formMethods;
    const { isSubmitting } = formState;

    // --- 🟢 初始化检查：对比 Server 数据与 IDB 本地数据 ---
    useEffect(() => {
        setIsMounted(true);
        setLastSavedTime(new Date());

        const checkVersions = async () => {
            try {
                // 1. 检查 IndexedDB (P1 核心: 离线编辑优先)
                const db = await initDB();
                const localNote = await db.get('notes', note.id);

                // 如果本地有数据，且更新时间晚于服务器数据
                if (localNote && new Date(localNote.updatedAt).getTime() > new Date(note.updatedAt).getTime()) {
                    console.log("Found newer local version in IDB");
                    reset({
                        title: localNote.title,
                        category: localNote.category || "",
                        tags: localNote.tags ? localNote.tags.map((t: any) => t.name) : [],
                        content: localNote.content
                    });
                    toast.info("已加载本地未同步的最新版本", { icon: <History className="w-4 h-4" /> });
                    return;
                }

                // 2. 检查 LocalStorage (崩溃恢复)
                const draftStr = localStorage.getItem(getDraftKey(note.id));
                if (draftStr) {
                    const draft = JSON.parse(draftStr);
                    reset(draft);
                    toast.warning("已恢复上次未保存的草稿");
                }
            } catch (e) {
                console.error(e);
            }
        };

        checkVersions();
    }, [note, reset]);

    // --- 📸 图片上传逻辑 (复用) ---
    const handlePaste = async (e: React.ClipboardEvent) => { /*...同Create...*/
        const items = e.clipboardData.items;
        let file: File | null = null;
        for (const item of items) { if (item.type.startsWith("image")) { file = item.getAsFile(); break; } }
        if (!file) return;
        const textarea = e.target as HTMLTextAreaElement;
        if (textarea.tagName !== "TEXTAREA") return;
        e.preventDefault();
        await uploadImage(file, textarea.selectionStart || 0, textarea.selectionEnd || 0);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => { /*...同Create...*/
        const file = e.target.files?.[0];
        if (!file) return;
        const currentContent = getValues("content") || "";
        const prefix = currentContent.endsWith('\n') || currentContent === "" ? "" : "\n";
        await uploadImage(file, currentContent.length, currentContent.length, prefix);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const uploadImage = async (file: File, startPos: number, endPos: number, prefix = "") => {
        try {
            setIsUploading(true);
            const loadingToast = toast.loading("正在上传图片...");
            const currentContent = getValues("content") || "";
            const placeholder = `${prefix}![上传中...](...)`;
            setValue("content", `${currentContent.substring(0, startPos)}${placeholder}${currentContent.substring(endPos)}`, { shouldDirty: true });

            const response = await fetch(`/api/upload?filename=${file.name}`, { method: 'POST', body: file });
            if (!response.ok) throw new Error(await response.text());
            const data = await response.json();

            const newContent = getValues("content").replace(placeholder, `${prefix}![image](${data.url})`);
            setValue("content", newContent, { shouldDirty: true });
            toast.dismiss(loadingToast);
        } catch (error) {
            toast.error("上传失败");
            setValue("content", getValues("content").replace(/!\[上传中\.\.\.\]\(\.\.\.\)/g, ""));
        } finally {
            setIsUploading(false);
        }
    };

    // --- 🔥 P1 核心修改：自动保存逻辑 ---
    const debouncedAutoSave = useDebouncedCallback(async (values: z.infer<typeof formSchema>) => {
        if (isSubmitting || isSuccess || isUploading) return;
        setSaveStatus("saving");

        try {
            // 1. 始终写入 IndexedDB (乐观更新，确保本地Read Path也是新的)
            const db = await initDB();
            const noteData = {
                id: note.id,
                ...values,
                tags: values.tags.map(t => ({ name: t })), // 格式化为对象存入
                updatedAt: new Date(),
                createdAt: note.updatedAt // 保持原创建时间或从note获取
            };
            await db.put('notes', noteData);

            // 备份到 LocalStorage (双重保险)
            localStorage.setItem(getDraftKey(note.id), JSON.stringify(values));

            // 2. 网络判断
            if (!navigator.onLine) {
                // 离线：加入队列
                await SyncManager.enqueue({
                    type: 'UPDATE',
                    noteId: note.id,
                    data: values
                });
                setSaveStatus("offline-saved");
                return;
            }

            // 在线：直接尝试同步 (更稳健)
            const formData = new FormData();
            formData.append("id", note.id);
            formData.append("title", values.title);
            formData.append("content", values.content);
            formData.append("category", values.category || "");
            formData.append("tags", values.tags.join(","));

            const result = await updateNote(formData);
            if (result?.success) {
                setSaveStatus("saved");
                setLastSavedTime(new Date());
                clearLocalDraft(note.id); // 只有云端成功才清草稿
            } else {
                setSaveStatus("error");
            }
        } catch (error) {
            console.error("Auto save error", error);
            // 如果出错（例如网络突然断了），回退到离线状态
            setSaveStatus("offline-saved");
            await SyncManager.enqueue({ type: 'UPDATE', noteId: note.id, data: values });
        }
    }, 1000);

    // --- 手动保存 ---
    const onManualSubmit = useCallback(async (values: z.infer<typeof formSchema>) => {
        if (isSuccess) return;
        debouncedAutoSave.cancel();

        // 复用自动保存逻辑，但强制触发一次
        await debouncedAutoSave(values);

        const isOnline = navigator.onLine;
        toast.success("已保存", {
            description: isOnline ? "云端同步完成" : "已存入本地，连网后自动同步",
            icon: isOnline ? <Cloud className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />
        });

        // 可选：跳转回详情页
        // router.push(`/notes/${note.id}`); 
    }, [isSuccess, debouncedAutoSave]);

    // 快捷键监听
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "s" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit(onManualSubmit)(); }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, [handleSubmit, onManualSubmit]);

    // 监听表单变化触发自动保存
    useEffect(() => {
        const subscription = watch((value) => { if (value) debouncedAutoSave(value as any); });
        return () => subscription.unsubscribe();
    }, [watch, debouncedAutoSave]);

    const isButtonDisabled = isSubmitting || isSuccess || isUploading;

    return (
        <Form {...formMethods}>
            <form onSubmit={handleSubmit(onManualSubmit)} className="space-y-6 relative">
                {/* 顶部状态栏 */}
                <div className="absolute -top-12 right-0 flex items-center gap-2 text-sm text-gray-500 transition-all duration-500">
                    {saveStatus === "saving" && <><Loader2 className="h-3 w-3 animate-spin" /><span>正在保存...</span></>}
                    {saveStatus === "saved" && <><Cloud className="h-3 w-3" /><span>云端已同步 {isMounted && lastSavedTime?.toLocaleTimeString()}</span></>}
                    {saveStatus === "offline-saved" && (
                        <span className="text-amber-600 flex items-center bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                            <WifiOff className="h-3 w-3 mr-1" /> 离线模式：已存本地
                        </span>
                    )}
                    {saveStatus === "error" && <span className="text-red-500">保存失败</span>}
                </div>

                <FormField
                    control={control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>笔记标题</FormLabel>
                            <FormControl><Input className="text-lg py-6" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>分类</FormLabel>
                                <FormControl><CategoryInput value={field.value || ""} onChange={field.onChange} existingCategories={existingCategories} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="tags"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>标签</FormLabel>
                                <FormControl><TagInput value={field.value} onChange={field.onChange} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={control}
                    name="content"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex justify-between items-end mb-1">
                                <span>内容详情</span>
                                <div className="flex items-center gap-2">
                                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                                    {isUploading && <span className="text-xs text-blue-500 animate-pulse flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> 上传中...</span>}
                                    <Button type="button" variant="secondary" size="sm" className="h-7 px-3 text-xs gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                        <ImagePlus size={14} /> 插入图片
                                    </Button>
                                </div>
                            </FormLabel>
                            <FormControl>
                                <div onPaste={handlePaste}>
                                    <MdEditorLoader name="content" value={field.value} onChange={field.onChange} placeholder="在此处开始你的创作..." />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-4">
                    <Link href={`/notes/${note.id}`}><Button variant="outline" type="button">取消</Button></Link>
                    <Button type="submit" disabled={isButtonDisabled} className="min-w-[100px]">
                        {isSuccess ? "完成" : "保存修改"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}