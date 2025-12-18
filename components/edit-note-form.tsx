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

// 🌍 协同相关
import {
    RoomProvider,
    useBroadcastEvent,
    useEventListener,
    useUpdateMyPresence,
    useStatus // 👈 现在这里不会报错了
} from "@/liveblocks.config";
import { ClientSideSuspense } from "@liveblocks/react";
import CollaborativeAvatars from "@/components/collaborative-avatars";
import { LiveCursors } from "@/components/cursor/live-cursors";

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
        updatedAt: Date;
    };
    existingCategories: string[];
}

const getDraftKey = (noteId: string) => `note-draft-${noteId}`;
const clearLocalDraft = (noteId: string) => { try { if (typeof window !== 'undefined') localStorage.removeItem(getDraftKey(noteId)); } catch (e) { } };

// -----------------------------------------------------------------------------
// 内部逻辑组件
// -----------------------------------------------------------------------------
function EditNoteFormInner({ note, existingCategories }: EditNoteFormProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLFormElement>(null);

    const [isSuccess, setIsSuccess] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error" | "offline-saved">("saved");
    const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    // 🔒 广播死循环锁
    const isRemoteUpdate = useRef(false);

    // 🌍 监听连接状态 (用于无缝切换)
    const status = useStatus();
    const prevStatus = useRef(status);

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

    // --- 🌍 0. 核心逻辑：处理“本地 <-> 协作”切换的瞬间 ---
    useEffect(() => {
        const isReconnected = prevStatus.current !== "connected" && status === "connected";

        if (isReconnected) {
            console.log("🔄 网络/协作服务已恢复，正在对齐状态...");
            SyncManager.sync().then(() => {
                // router.refresh(); 
            });
        }
        prevStatus.current = status;
    }, [status, router]);

    // --- 🌍 1. 协同：光标追踪逻辑 ---
    const updateMyPresence = useUpdateMyPresence();

    const handlePointerMove = (e: React.PointerEvent<HTMLFormElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        updateMyPresence({ cursor: { x, y } });
    };

    const handlePointerLeave = () => {
        updateMyPresence({ cursor: null });
    };

    // --- 🌍 2. 协同：接收全字段广播 ---
    const broadcast = useBroadcastEvent();

    useEventListener(({ event }) => {
        if (event.type === "UPDATE_FIELD") {
            const { field, value } = event;
            const currentValue = getValues(field);

            // 深度比较
            const isDifferent = JSON.stringify(currentValue) !== JSON.stringify(value);

            if (isDifferent) {
                isRemoteUpdate.current = true; // 上锁

                console.log(`收到协同更新: ${field}`);
                setValue(field, value, { shouldDirty: true });

                setTimeout(() => { isRemoteUpdate.current = false; }, 0); // 解锁
            }
        }
    });

    // --- 初始化检查 ---
    useEffect(() => {
        setIsMounted(true);
        setLastSavedTime(new Date());

        const checkVersions = async () => {
            try {
                const db = await initDB();
                const localNote = await db.get('notes', note.id);
                if (localNote && new Date(localNote.updatedAt).getTime() > new Date(note.updatedAt).getTime()) {
                    reset({
                        title: localNote.title,
                        category: localNote.category || "",
                        tags: localNote.tags ? localNote.tags.map((t: any) => t.name) : [],
                        content: localNote.content
                    });
                    toast.info("已加载本地最新版本", { icon: <History className="w-4 h-4" /> });
                    return;
                }
                const draftStr = localStorage.getItem(getDraftKey(note.id));
                if (draftStr) {
                    reset(JSON.parse(draftStr));
                    toast.warning("已恢复草稿");
                }
            } catch (e) { console.error(e); }
        };
        checkVersions();
    }, [note, reset]);

    // --- 上传逻辑 ---
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

            // 🌍 图片也要广播
            broadcast({ type: "UPDATE_FIELD", field: "content", value: newContent });

            toast.dismiss(loadingToast);
        } catch (error) {
            toast.error("上传失败");
            setValue("content", getValues("content").replace(/!\[上传中\.\.\.\]\(\.\.\.\)/g, ""));
        } finally { setIsUploading(false); }
    };

    // --- 自动保存 ---
    const debouncedAutoSave = useDebouncedCallback(async (values: z.infer<typeof formSchema>) => {
        if (isSubmitting || isSuccess || isUploading) return;
        setSaveStatus("saving");

        try {
            const db = await initDB();
            const noteData = { id: note.id, ...values, tags: values.tags.map(t => ({ name: t })), updatedAt: new Date(), createdAt: note.updatedAt };
            await db.put('notes', noteData);
            localStorage.setItem(getDraftKey(note.id), JSON.stringify(values));

            if (!navigator.onLine) {
                await SyncManager.enqueue({ type: 'UPDATE', noteId: note.id, data: values });
                setSaveStatus("offline-saved");
                return;
            }

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
                clearLocalDraft(note.id);
            } else { setSaveStatus("error"); }
        } catch (error) {
            setSaveStatus("offline-saved");
            await SyncManager.enqueue({ type: 'UPDATE', noteId: note.id, data: values });
        }
    }, 1000);

    // --- 手动保存 ---
    const onManualSubmit = useCallback(async (values: z.infer<typeof formSchema>) => {
        if (isSuccess) return;
        debouncedAutoSave.cancel();
        await debouncedAutoSave(values);
        toast.success("已保存", { description: navigator.onLine ? "云端同步完成" : "已存入本地" });
        router.refresh();
    }, [isSuccess, debouncedAutoSave, router]);

    useEffect(() => {
        const down = (e: KeyboardEvent) => { if (e.key === "s" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit(onManualSubmit)(); } };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, [handleSubmit, onManualSubmit]);

    // --- 🌍 3. 协同：全字段广播 ---
    useEffect(() => {
        const subscription = watch((value, { name }) => {
            if (isRemoteUpdate.current) return; // 锁

            if (value && name) {
                debouncedAutoSave(value as any);

                const fieldValue = value[name as keyof typeof value];
                broadcast({
                    type: "UPDATE_FIELD",
                    field: name as any,
                    value: fieldValue
                });
            }
        });
        return () => subscription.unsubscribe();
    }, [watch, debouncedAutoSave, broadcast]);

    const isButtonDisabled = isSubmitting || isSuccess || isUploading;

    return (
        <Form {...formMethods}>
            <form
                onSubmit={handleSubmit(onManualSubmit)}
                className="space-y-6 relative pt-4"
                ref={containerRef}
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
            >
                {/* 🌍 渲染其他人的光标 */}
                <LiveCursors />

                {/* --- 顶部工具栏 --- */}
                <div className="absolute -top-10 left-0 right-0 flex justify-between items-center h-10">

                    {/* 左侧：双状态显示 */}
                    <div className="flex items-center gap-4">
                        {/* 1. 保存状态 */}
                        <div className="flex items-center gap-2 text-sm text-gray-500 transition-all duration-500">
                            {saveStatus === "saving" && <><Loader2 className="h-3 w-3 animate-spin" /><span>正在保存</span></>}
                            {saveStatus === "saved" && <><Cloud className="h-3 w-3" /><span>已同步</span></>}
                            {saveStatus === "offline-saved" && (
                                <span className="text-amber-600 flex items-center bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-xs">
                                    <WifiOff className="h-3 w-3 mr-1" /> 离线保存
                                </span>
                            )}
                            {saveStatus === "error" && <span className="text-red-500">保存失败</span>}
                        </div>

                        {/* 2. 协作状态指示器 */}
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-100 text-xs text-gray-600">
                            <div className={`w-2 h-2 rounded-full ${status === "connected" ? "bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]" :
                                status === "reconnecting" ? "bg-yellow-500 animate-pulse" : "bg-gray-300"
                                }`} />
                            <span className="font-medium">
                                {status === "connected" ? "实时协作中" :
                                    status === "reconnecting" ? "正在连接..." : "本地模式"}
                            </span>
                        </div>
                    </div>

                    {/* 右侧：协作者头像 */}
                    <div>
                        <CollaborativeAvatars />
                    </div>
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

                {/* ✅ 修复了这里的语法错误 */}
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

// -----------------------------------------------------------------------------
// 外部 Wrapper
// -----------------------------------------------------------------------------
export default function EditNoteFormWrapper(props: EditNoteFormProps) {
    return (
        <RoomProvider
            id={`note-${props.note.id}`}
            initialPresence={{ isTyping: false, cursor: null }}
            initialStorage={{
                title: props.note.title,
                content: props.note.content,
            }}
        >
            <ClientSideSuspense fallback={
                <div className="h-[500px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p>正在连接实时协作服务...</p>
                </div>
            }>
                {() => <EditNoteFormInner {...props} />}
            </ClientSideSuspense>
        </RoomProvider>
    );
}