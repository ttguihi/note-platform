// components/create-note-form.tsx
'use client';

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createNote } from "@/app/actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import MdEditorLoader from "@/components/md-editor-loader";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import CategoryInput from "@/components/category-input";
import TagInput from "@/components/tag-input";
import { Input } from "@/components/ui/input";
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

export default function CreateNoteForm({ existingCategories }: CreateNoteFormProps) {
    const router = useRouter();

    // UI 状态
    const [isSuccess, setIsSuccess] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            category: "",
            tags: [],
            content: "",
        },
    });

    const { isSubmitting } = form.formState;

    // 👇 使用 useCallback 包裹提交逻辑，解决 useEffect 依赖警告
    const onSubmit = useCallback(async (values: z.infer<typeof formSchema>) => {
        if (isSuccess) return;

        const formData = new FormData();
        formData.append("title", values.title);
        formData.append("content", values.content);
        formData.append("category", values.category || "");
        formData.append("tags", values.tags.join(","));

        try {
            const result = await createNote(formData);

            if (result?.success) {
                setIsSuccess(true);
                toast.success("笔记创建成功！", {
                    description: "正在跳转回首页...",
                    duration: 2000,
                });

                setTimeout(() => {
                    router.push("/");
                    router.refresh();
                }, 1000);

                // 人为挂起 Promise，保持禁用状态直到跳转
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            toast.error("创建失败", { description: "请检查网络或稍后重试" });
        }
    }, [isSuccess, router]);

    // ⌨️ 快捷键监听
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                form.handleSubmit(onSubmit)();
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, [form, onSubmit]); // ✅ 现在 onSubmit 是稳定的，可以作为依赖

    const isButtonDisabled = isSubmitting || isSuccess;

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
                        control={form.control}
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
                            control={form.control}
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
                            control={form.control}
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
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>内容详情</FormLabel>
                                <FormControl>
                                    <MdEditorLoader
                                        name="content"
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="在此处开始你的创作..."
                                    />
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
                                    {isSuccess ? "跳转中..." : "保存中..."}
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