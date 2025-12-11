'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createNote } from "@/app/actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft, Loader2, ImagePlus } from "lucide-react";
import MdEditorLoader from "@/components/md-editor-loader";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import CategoryInput from "@/components/category-input";
import TagInput from "@/components/tag-input";
import { Input } from "@/components/ui/input";
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

interface CreateNoteFormProps {
    existingCategories: string[];
}

// --- LocalStorage 工具函数 ---
const CREATE_DRAFT_KEY = "create-note-draft";

const saveLocalDraft = (data: z.infer<typeof formSchema>) => {
    try {
        if (typeof window !== 'undefined') {
            localStorage.setItem(CREATE_DRAFT_KEY, JSON.stringify(data));
        }
    } catch (e) {
        console.error("无法写入 LocalStorage", e);
    }
};

const getLocalDraft = (): z.infer<typeof formSchema> | null => {
    try {
        if (typeof window === 'undefined') return null;
        const draft = localStorage.getItem(CREATE_DRAFT_KEY);
        return draft ? formSchema.parse(JSON.parse(draft)) : null;
    } catch (e) {
        return null;
    }
};

const clearLocalDraft = () => {
    try {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(CREATE_DRAFT_KEY);
        }
    } catch (e) {
        console.error("无法清除 LocalStorage", e);
    }
};

export default function CreateNoteForm({ existingCategories }: CreateNoteFormProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null); // 隐藏的文件输入框引用

    const [isSuccess, setIsSuccess] = useState(false);
    const [isUploading, setIsUploading] = useState(false); // 图片上传状态

    // ❌ 移除顶层调用，修复 Hydration Error
    // const initialDraft = getLocalDraft();

    // ✅ useForm 初始化只使用空值
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            category: "",
            tags: [],
            content: "",
        },
    });

    const { control, handleSubmit, watch, setValue, getValues, reset } = form; // 👈 解构 reset
    const { isSubmitting } = form.formState;

    // ✅ 在 useEffect 中恢复草稿
    useEffect(() => {
        const draft = getLocalDraft();
        if (draft) {
            reset({
                title: draft.title || "",
                category: draft.category || "",
                tags: draft.tags || [],
                content: draft.content || "",
            });

            toast.warning("已自动恢复上次未提交的草稿内容。", {
                duration: 5000,
                id: "draft-restore" // 👈 防止重复弹窗
            });
        }
    }, [reset]);

    // --- 📸 1. 粘贴图片上传 (Ctrl+V) ---
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

        // 获取真正的 textarea 元素
        const textarea = e.target as HTMLTextAreaElement;
        if (textarea.tagName !== "TEXTAREA") return;

        e.preventDefault();

        const startPos = textarea.selectionStart || 0;
        const endPos = textarea.selectionEnd || 0;

        await uploadImage(file, startPos, endPos);
    };

    // --- 📸 2. 按钮选择图片上传 (移动端) ---
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 按钮上传默认追加到文末
        const currentContent = getValues("content") || "";
        const startPos = currentContent.length;
        const endPos = currentContent.length;

        // 如果文末没有换行，先加个换行符，避免图片跟文字连在一起
        const prefix = currentContent.endsWith('\n') || currentContent === "" ? "" : "\n";

        await uploadImage(file, startPos, endPos, prefix);

        // 清空 input，允许重复选择同一张图
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

            // 插入占位符
            setValue("content", `${beforeText}${placeholder}${afterText}`, { shouldDirty: true });

            // 调用后端 API
            const response = await fetch(`/api/upload?filename=${file.name}`, {
                method: 'POST',
                body: file,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }
            const data = await response.json();

            // 替换占位符为真实链接
            const updatedContent = getValues("content");
            const newContent = updatedContent.replace(placeholder, `${prefix}![image](${data.url})`);
            setValue("content", newContent, { shouldDirty: true });

            toast.dismiss(loadingToast);
            toast.success("图片上传成功");

        } catch (error) {
            console.error(error);
            toast.error("上传失败");
            // 失败移除占位符
            const content = getValues("content").replace(/!\[上传中\.\.\.\]\(\.\.\.\)/g, "");
            setValue("content", content);
        } finally {
            setIsUploading(false);
        }
    };

    // --- 自动保存草稿 ---
    const debouncedLocalSave = useDebouncedCallback((values: z.infer<typeof formSchema>) => {
        saveLocalDraft(values);
    }, 500);

    // --- 提交表单 ---
    const onSubmit = useCallback(async (values: z.infer<typeof formSchema>) => {
        if (isSuccess) return;

        debouncedLocalSave.cancel();

        const formData = new FormData();
        formData.append("title", values.title);
        formData.append("content", values.content);
        formData.append("category", values.category || "");
        formData.append("tags", values.tags.join(","));

        try {
            const result = await createNote(formData);

            if (result?.success) {
                setIsSuccess(true);
                clearLocalDraft();
                toast.success("笔记创建成功！", {
                    description: "正在跳转回首页...",
                    duration: 2000,
                });

                setTimeout(() => {
                    router.push("/");
                    router.refresh();
                }, 1000);

                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        } catch (error) {
            toast.error("创建失败", { description: "请检查网络或稍后重试" });
        }
    }, [isSuccess, router, debouncedLocalSave]);

    // 快捷键监听
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit(onSubmit)();
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, [handleSubmit, onSubmit]);

    // 监听变化自动保存
    useEffect(() => {
        const subscription = watch((value) => {
            if (value) {
                debouncedLocalSave(value as z.infer<typeof formSchema>);
            }
        });
        return () => subscription.unsubscribe();
    }, [watch, debouncedLocalSave]);

    const isButtonDisabled = isSubmitting || isSuccess || isUploading;

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/">
                    <Button variant="ghost" size="icon">
                        <ChevronLeft size={20} />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">创建新笔记</h1>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                    <FormField
                        control={control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>笔记标题</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="输入引人注目的标题..."
                                        className="text-lg py-6"
                                        autoFocus
                                        {...field}
                                    />
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
                                    <FormLabel>分类 (Category)</FormLabel>
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
                                    <FormLabel>标签 (Tags)</FormLabel>
                                    <FormControl>
                                        <TagInput
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
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
                        <Link href="/">
                            <Button variant="outline" type="button">取消</Button>
                        </Link>

                        <Button
                            type="submit"
                            disabled={isButtonDisabled}
                            className="px-8 min-w-[120px] relative group"
                        >
                            {isButtonDisabled ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {isUploading ? "等待图片..." : (isSuccess ? "跳转中..." : "保存发布")}
                                </>
                            ) : (
                                <span className="flex items-center">
                                    保存发布
                                    <span className="hidden sm:inline-block ml-2 text-[10px] opacity-60 font-normal border border-white/20 px-1 rounded">
                                        ⌘S
                                    </span>
                                </span>
                            )}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}