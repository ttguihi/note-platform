'use client';

import { useState, useEffect, useCallback, useRef } from "react"; // 👈 引入 useRef
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createNote } from "@/app/actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft, Loader2, ImagePlus } from "lucide-react"; // 👈 引入图标
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

    const [isSuccess, setIsSuccess] = useState(false);
    // 👇 新增：图片上传状态
    const [isUploading, setIsUploading] = useState(false);

    const initialDraft = getLocalDraft();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialDraft?.title || "",
            category: initialDraft?.category || "",
            tags: initialDraft?.tags || [],
            content: initialDraft?.content || "",
        },
    });

    const { control, handleSubmit, watch, setValue, getValues } = form; // 👈 解构 setValue, getValues
    const { isSubmitting } = form.formState;

    // --- 📸 图片上传逻辑 ---
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

        // 👇👇👇 关键修改开始 👇👇👇
        // 使用 e.target 获取真正的 textarea 元素
        const textarea = e.target as HTMLTextAreaElement;

        // 如果触发粘贴的不是 textarea (比如误触了边框)，直接忽略，防止报错
        if (textarea.tagName !== "TEXTAREA") return;
        // 👆👆👆 关键修改结束 👆👆👆

        e.preventDefault();

        // 现在 startPos 是正确的光标位置了
        const startPos = textarea.selectionStart || 0;
        const endPos = textarea.selectionEnd || 0;

        try {
            setIsUploading(true);
            const loadingToast = toast.loading("正在上传图片...");

            const currentContent = getValues("content");
            // 切割文本
            const beforeText = currentContent.substring(0, startPos);
            const afterText = currentContent.substring(endPos);
            const placeholder = `![上传中...](...)`;

            // 插入占位符
            setValue("content", `${beforeText}${placeholder}${afterText}`, { shouldDirty: true });

            // 上传
            const response = await fetch(`/api/upload?filename=${file.name}`, {
                method: 'POST',
                body: file,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Server Error:", response.status, errorText);
                throw new Error(`Upload failed: ${response.status} ${errorText}`);
            }
            const data = await response.json();

            // 替换占位符
            // 注意：这里重新获取 content 是为了防止用户在上传期间又输入了文字导致丢失
            // 但为了简单起见，且通常几秒钟很快，我们直接替换占位符字符串
            const newContent = getValues("content").replace(placeholder, `![image](${data.url})`);
            setValue("content", newContent, { shouldDirty: true });

            toast.dismiss(loadingToast);
            toast.success("图片上传成功");

        } catch (error) {
            console.error(error);
            toast.error("图片上传失败");
            const content = getValues("content").replace(`![上传中...](...)`, "");
            setValue("content", content);
        } finally {
            setIsUploading(false);
        }
    };
    // ----------------------

    const debouncedLocalSave = useDebouncedCallback((values: z.infer<typeof formSchema>) => {
        saveLocalDraft(values);
    }, 500);

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

    useEffect(() => {
        if (initialDraft) {
            toast.warning("已自动恢复上次未提交的草稿内容。", { duration: 5000 });
        }
    }, []);

    useEffect(() => {
        const subscription = watch((value) => {
            if (value) {
                debouncedLocalSave(value as z.infer<typeof formSchema>);
            }
        });
        return () => subscription.unsubscribe();
    }, [watch, debouncedLocalSave]);

    const isButtonDisabled = isSubmitting || isSuccess || isUploading; // 👈 禁用按钮如果正在上传

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
                                <FormLabel className="flex justify-between items-center">
                                    内容详情
                                    {isUploading && <span className="text-xs text-blue-500 animate-pulse flex items-center gap-1"><ImagePlus size={12} /> 图片上传中...</span>}
                                </FormLabel>
                                <FormControl>
                                    {/* 👇 关键：传递 onPaste 给编辑器 */}
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
                                    {isUploading ? "上传图片..." : (isSuccess ? "跳转中..." : "保存中...")}
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