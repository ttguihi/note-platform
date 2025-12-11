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
import { Loader2, Cloud, ImagePlus } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
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
    };
    existingCategories: string[];
}

// --- LocalStorage 工具函数 ---

const getDraftKey = (noteId: string) => `note-draft-${noteId}`;

const saveLocalDraft = (noteId: string, data: z.infer<typeof formSchema>) => {
    try {
        if (typeof window !== 'undefined') {
            localStorage.setItem(getDraftKey(noteId), JSON.stringify(data));
            localStorage.setItem(`${getDraftKey(noteId)}-timestamp`, new Date().toISOString());
        }
    } catch (e) {
        console.error("无法写入 LocalStorage", e);
    }
};

const getLocalDraft = (noteId: string): z.infer<typeof formSchema> | null => {
    try {
        if (typeof window === 'undefined') return null;
        const draft = localStorage.getItem(getDraftKey(noteId));
        return draft ? formSchema.parse(JSON.parse(draft)) : null;
    } catch (e) {
        return null;
    }
};

const clearLocalDraft = (noteId: string) => {
    try {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(getDraftKey(noteId));
            localStorage.removeItem(`${getDraftKey(noteId)}-timestamp`);
        }
    } catch (e) {
        console.error("无法清除 LocalStorage", e);
    }
};

export default function EditNoteForm({ note, existingCategories }: EditNoteFormProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isSuccess, setIsSuccess] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // ❌ 移除顶层 localStorage 读取，修复 Hydration Error
    // const initialDraft = getLocalDraft(note.id);

    const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
    const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    // ✅ useForm 初始化只使用服务端数据 (note)
    const formMethods = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: note.title,
            category: note.category ?? "",
            tags: note.tags.map(t => t.name),
            content: note.content,
        },
    });

    const { watch, control, handleSubmit, formState, setValue, getValues, reset } = formMethods; // 👈 解构 reset
    const { isSubmitting } = formState;

    // ✅ 在 useEffect 中处理草稿恢复
    useEffect(() => {
        setIsMounted(true);
        setLastSavedTime(new Date());

        // 仅在客户端执行草稿检查
        const draft = getLocalDraft(note.id);
        if (draft) {
            // 恢复草稿数据
            reset({
                title: draft.title ?? note.title,
                category: draft.category ?? note.category ?? "",
                tags: draft.tags ?? note.tags.map(t => t.name),
                content: draft.content ?? note.content,
            });

            const timestamp = localStorage.getItem(`${getDraftKey(note.id)}-timestamp`);
            const timeString = timestamp ? new Date(timestamp).toLocaleTimeString() : '上次编辑时';

            toast.warning("已自动恢复本地草稿！", {
                description: `上次本地保存时间：${timeString}。`,
                duration: 5000,
                id: "draft-restore" // 👈 防止重复弹窗
            });
        }
    }, [note.id, note.title, note.category, note.tags, note.content, reset]);

    // --- 📸 1. 粘贴上传 ---
    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        let file: File | null = null;

        for (const item of items) {
            if (item.type.startsWith("image")) {
                file = item.getAsFile();
                break;
            }
        }

        if (!file) return;

        const textarea = e.target as HTMLTextAreaElement;
        // 如果触发事件的不是 textarea (可能是容器 div)，则尝试查找内部 textarea
        // 这一步是为了兼容有些编辑器组件结构
        if (textarea.tagName !== "TEXTAREA") return;

        e.preventDefault();

        const startPos = textarea.selectionStart || 0;
        const endPos = textarea.selectionEnd || 0;

        await uploadImage(file, startPos, endPos);
    };

    // --- 📸 2. 按钮上传 ---
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const currentContent = getValues("content") || "";
        const startPos = currentContent.length;
        const endPos = currentContent.length;
        const prefix = currentContent.endsWith('\n') || currentContent === "" ? "" : "\n";

        await uploadImage(file, startPos, endPos, prefix);

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // --- ☁️ 统一上传逻辑 ---
    const uploadImage = async (file: File, startPos: number, endPos: number, prefix = "") => {
        try {
            setIsUploading(true);
            const loadingToast = toast.loading("正在上传图片...");

            const currentContent = getValues("content") || "";
            const beforeText = currentContent.substring(0, startPos);
            const afterText = currentContent.substring(endPos);
            const placeholder = `${prefix}![上传中...](...)`;

            setValue("content", `${beforeText}${placeholder}${afterText}`, { shouldDirty: true });

            const response = await fetch(`/api/upload?filename=${file.name}`, {
                method: 'POST',
                body: file,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }
            const data = await response.json();

            // 重新获取 content 以防在上传期间用户输入了文字，导致位置偏移
            // 为了简单起见，这里直接做字符串替换。更严谨的做法是重新计算位置。
            const updatedContent = getValues("content");
            const newContent = updatedContent.replace(placeholder, `${prefix}![image](${data.url})`);
            setValue("content", newContent, { shouldDirty: true });

            toast.dismiss(loadingToast);
            toast.success("图片上传成功");

        } catch (error) {
            console.error(error);
            toast.error("上传失败");
            const content = getValues("content").replace(/!\[上传中\.\.\.\]\(\.\.\.\)/g, "");
            setValue("content", content);
        } finally {
            setIsUploading(false);
        }
    };

    // --- 自动保存 ---
    const debouncedAutoSave = useDebouncedCallback(async (values: z.infer<typeof formSchema>) => {
        if (isSubmitting || isSuccess || isUploading) return;

        saveLocalDraft(note.id, values);

        setSaveStatus("saving");
        const formData = new FormData();
        formData.append("id", note.id);
        formData.append("title", values.title);
        formData.append("content", values.content);
        formData.append("category", values.category || "");
        formData.append("tags", values.tags.join(","));

        try {
            const result = await updateNote(formData);
            if (result?.success) {
                setSaveStatus("saved");
                setLastSavedTime(new Date());
                clearLocalDraft(note.id);
                router.refresh();
            } else {
                setSaveStatus("error");
            }
        } catch (error) {
            setSaveStatus("error");
            console.warn("自动保存失败");
        }
    }, 1000);

    const onManualSubmit = useCallback(async (values: z.infer<typeof formSchema>) => {
        if (isSuccess) return;

        debouncedAutoSave.cancel();

        const formData = new FormData();
        formData.append("id", note.id);
        formData.append("title", values.title);
        formData.append("content", values.content);
        formData.append("category", values.category || "");
        formData.append("tags", values.tags.join(","));

        try {
            const result = await updateNote(formData);

            if (result?.success) {
                setIsSuccess(true);
                clearLocalDraft(note.id);
                toast.success("笔记已更新！", {
                    description: "正在返回详情页...",
                    duration: 1500,
                });

                setTimeout(() => {
                    router.push(`/notes/${note.id}`);
                    router.refresh();
                }, 1000);

                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        } catch (error) {
            toast.error("更新失败", { description: "请检查网络或稍后重试" });
        }
    }, [isSuccess, note.id, router, debouncedAutoSave]);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit(onManualSubmit)();
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, [handleSubmit, onManualSubmit]);

    // 监听变化自动保存
    useEffect(() => {
        const subscription = watch((value) => {
            if (value) {
                debouncedAutoSave(value as z.infer<typeof formSchema>);
            }
        });
        return () => subscription.unsubscribe();
    }, [watch, debouncedAutoSave]);

    const isButtonDisabled = isSubmitting || isSuccess || isUploading;

    return (
        <Form {...formMethods}>
            <form onSubmit={handleSubmit(onManualSubmit)} className="space-y-6 relative">

                <div className="absolute -top-12 right-0 flex items-center gap-2 text-sm text-gray-500 transition-all duration-500">
                    {saveStatus === "saving" && (
                        <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>自动保存中... (本地)</span>
                        </>
                    )}
                    {saveStatus === "saved" && (
                        <>
                            <Cloud className="h-3 w-3" />
                            {isMounted && lastSavedTime ? (
                                <span>云端已同步 {lastSavedTime.toLocaleTimeString()}</span>
                            ) : (
                                <span>云端已同步</span>
                            )}
                        </>
                    )}
                    {saveStatus === "error" && (
                        <span className="text-red-500 flex items-center">
                            <Cloud className="h-3 w-3 mr-1" />
                            自动同步失败，**数据已保存在本地**
                        </span>
                    )}
                </div>

                <FormField
                    control={control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>笔记标题</FormLabel>
                            <FormControl>
                                <Input className="text-lg py-6" {...field} />
                            </FormControl>
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
                                <FormControl>
                                    <CategoryInput
                                        value={field.value || ""}
                                        onChange={field.onChange}
                                        existingCategories={existingCategories}
                                    />
                                </FormControl>
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
                                <FormControl>
                                    <TagInput value={field.value} onChange={field.onChange} />
                                </FormControl>
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

                                {/* 👇 上传按钮区域 */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                    />

                                    {isUploading && (
                                        <span className="text-xs text-blue-500 animate-pulse flex items-center gap-1">
                                            <Loader2 size={12} className="animate-spin" /> 上传中...
                                        </span>
                                    )}

                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="h-7 px-3 text-xs gap-1.5"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                    >
                                        <ImagePlus size={14} />
                                        插入图片
                                    </Button>
                                </div>
                                {/* 👆 上传按钮区域结束 */}

                            </FormLabel>
                            <FormControl>
                                <div onPaste={handlePaste}>
                                    <MdEditorLoader
                                        name="content"
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="在此处开始你的创作... (支持粘贴图片)"
                                    />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-4">
                    <Link href={`/notes/${note.id}`}>
                        <Button variant="outline" type="button">取消</Button>
                    </Link>

                    <Button type="submit" disabled={isButtonDisabled} className="px-8 min-w-[120px] relative group">
                        {isButtonDisabled ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {isUploading ? "等待图片..." : (isSuccess ? "跳转中..." : "保存修改")}
                            </>
                        ) : (
                            <span className="flex items-center">
                                保存修改
                                <span className="hidden sm:inline-block ml-2 text-[10px] opacity-60 font-normal border border-white/20 px-1 rounded">
                                    ⌘S
                                </span>
                            </span>
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}