'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createNote } from "@/app/actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft, Loader2, ImagePlus, WifiOff, FileText } from "lucide-react";
import MdEditorLoader from "@/components/md-editor-loader";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import CategoryInput from "@/components/category-input";
import TagInput from "@/components/tag-input";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "use-debounce";
import { initDB } from "@/lib/indexeddb";
import { SyncManager } from "@/lib/sync-manager";
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

interface CreateNoteFormProps {
    existingCategories: string[];
}

const CREATE_DRAFT_KEY = "create-note-draft";
const saveLocalDraft = (data: z.infer<typeof formSchema>) => {
    try { if (typeof window !== 'undefined') localStorage.setItem(CREATE_DRAFT_KEY, JSON.stringify(data)); } catch (e) { }
};
const getLocalDraft = (): z.infer<typeof formSchema> | null => {
    try { if (typeof window === 'undefined') return null; const d = localStorage.getItem(CREATE_DRAFT_KEY); return d ? JSON.parse(d) : null; } catch (e) { return null; }
};
const clearLocalDraft = () => {
    try { if (typeof window !== 'undefined') localStorage.removeItem(CREATE_DRAFT_KEY); } catch (e) { }
};

export default function CreateNoteForm({ existingCategories }: CreateNoteFormProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isSuccess, setIsSuccess] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "draft-saved">("saved");
    const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { title: "", category: "", tags: [], content: "" },
    });

    const { control, handleSubmit, watch, setValue, getValues, reset } = form;
    const { isSubmitting } = form.formState;

    // 恢复草稿
    useEffect(() => {
        const draft = getLocalDraft();
        if (draft) {
            reset(draft);
            setSaveStatus("draft-saved");
            setLastSavedTime(new Date());
            toast.warning("已自动恢复上次未提交的草稿内容。", { duration: 5000, id: "draft-restore" });
        }
    }, [reset]);

    // 图片处理逻辑 (保持不变)
    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        let file: File | null = null;
        for (const item of items) { if (item.type.startsWith("image")) { file = item.getAsFile(); break; } }
        if (!file) return;
        const textarea = e.target as HTMLTextAreaElement;
        if (textarea.tagName !== "TEXTAREA") return;
        e.preventDefault();
        await uploadImage(file, textarea.selectionStart || 0, textarea.selectionEnd || 0);
    };
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
            toast.success("图片上传成功");
        } catch (error) {
            toast.error("上传失败");
            setValue("content", getValues("content").replace(/!\[上传中\.\.\.\]\(\.\.\.\)/g, ""));
        } finally { setIsUploading(false); }
    };

    const debouncedLocalSave = useDebouncedCallback((values) => {
        setSaveStatus("saving");
        saveLocalDraft(values);
        setTimeout(() => { setSaveStatus("draft-saved"); setLastSavedTime(new Date()); }, 500);
    }, 1000);

    // --- 🛡️ 抽离：离线保存核心逻辑 (Fallback) ---
    const executeOfflineSave = async (values: z.infer<typeof formSchema>) => {
        try {
            console.log("进入离线保存流程...");
            const tempId = crypto.randomUUID();
            const now = new Date();
            const noteData = {
                id: tempId,
                title: values.title,
                content: values.content,
                category: values.category || null,
                tags: values.tags.map(t => ({ id: crypto.randomUUID(), name: t })),
                createdAt: now,
                updatedAt: now,
                summary: null
            };

            const db = await initDB();
            await db.put('notes', noteData);
            await SyncManager.enqueue({ type: 'CREATE', noteId: tempId, data: values });

            clearLocalDraft();

            // 提示用户
            toast.success("网络不可用，已离线保存", {
                description: "数据已存入本地，连网后自动同步",
                icon: <WifiOff className="h-4 w-4 text-amber-500" />,
                duration: 4000
            });

            // 尝试跳转，如果失败（例如断网导致无法加载首页资源），则停留在当前页并清空表单
            try {
                router.push("/");
            } catch (navError) {
                console.warn("Offline navigation failed, resetting form instead.");
                reset({ title: "", content: "", category: "", tags: [] }); // 重置表单，让用户知道保存成功了
            }

        } catch (e) {
            console.error(e);
            toast.error("本地保存也失败了，请截图备份！");
        }
    };

    // --- 🚀 提交逻辑：请求失败自动降级 ---
    const onSubmit = useCallback(async (values: z.infer<typeof formSchema>) => {
        if (isSuccess) return;
        debouncedLocalSave.cancel();

        // 构造 FormData
        const formData = new FormData();
        formData.append("title", values.title);
        formData.append("content", values.content);
        formData.append("category", values.category || "");
        formData.append("tags", values.tags.join(","));

        try {
            // 1. 先检查显式的离线状态
            if (!navigator.onLine) {
                throw new Error("Offline Mode Detected");
            }

            // 2. 尝试发送请求
            const result = await createNote(formData);

            // 3. 检查业务逻辑错误
            if (!result?.success) {
                throw new Error("Server Action Failed");
            }

            // 成功流程
            setIsSuccess(true);
            clearLocalDraft();
            toast.success("笔记创建成功！", { description: "正在跳转回首页..." });
            setTimeout(() => { router.push("/"); router.refresh(); }, 1000);

        } catch (error) {
            // ⚠️ 只要上面任何一步出错 (断网、500错误、超时)，都会掉进这里
            // 立即启动离线保存方案
            console.warn("在线提交失败，切换至离线保存...", error);
            await executeOfflineSave(values);
        }
    }, [isSuccess, router, debouncedLocalSave]);

    useEffect(() => {
        const down = (e: KeyboardEvent) => { if (e.key === "s" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit(onSubmit)(); } };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, [handleSubmit, onSubmit]);

    useEffect(() => {
        const subscription = watch((value) => { if (value) debouncedLocalSave(value as any); });
        return () => subscription.unsubscribe();
    }, [watch, debouncedLocalSave]);

    const isButtonDisabled = isSubmitting || isSuccess || isUploading;

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/">
                    <Button variant="ghost" size="icon"><ChevronLeft size={20} /></Button>
                </Link>
                <h1 className="text-2xl font-bold">创建新笔记</h1>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 relative">
                    {/* 状态栏 */}
                    <div className="absolute -top-12 right-0 flex items-center gap-2 text-sm text-gray-500 transition-all duration-500">
                        {saveStatus === "saving" && <><Loader2 className="h-3 w-3 animate-spin" /><span>草稿保存中...</span></>}
                        {saveStatus === "draft-saved" && <><FileText className="h-3 w-3" /><span>草稿已存本地 {lastSavedTime?.toLocaleTimeString()}</span></>}
                    </div>

                    <FormField control={control} name="title" render={({ field }) => (
                        <FormItem><FormLabel>笔记标题</FormLabel><FormControl><Input placeholder="输入引人注目的标题..." className="text-lg py-6" autoFocus {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={control} name="category" render={({ field }) => (
                            <FormItem><FormLabel>分类</FormLabel><FormControl><CategoryInput value={field.value || ""} onChange={field.onChange} existingCategories={existingCategories} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={control} name="tags" render={({ field }) => (
                            <FormItem><FormLabel>标签</FormLabel><FormControl><TagInput value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>

                    <FormField control={control} name="content" render={({ field }) => (
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
                                    <MdEditorLoader name="content" value={field.value} onChange={field.onChange} placeholder="在此处开始你的创作... (支持粘贴图片)" />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <div className="flex justify-end gap-4">
                        <Link href="/"><Button variant="outline" type="button">取消</Button></Link>
                        <Button type="submit" disabled={isButtonDisabled} className="px-8 min-w-[120px]">
                            {isButtonDisabled ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />处理中</> : "保存发布"}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}