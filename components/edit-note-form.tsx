// components/edit-note-form.tsx
'use client';

import { useState, useEffect, useCallback } from "react";
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
import { Loader2, Cloud } from "lucide-react";
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

export default function EditNoteForm({ note, existingCategories }: EditNoteFormProps) {
    const router = useRouter();

    // 状态管理
    const [isSuccess, setIsSuccess] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
    const [lastSavedTime, setLastSavedTime] = useState<Date>(new Date());

    // 初始化表单
    const formMethods = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: note.title,
            category: note.category || "",
            tags: note.tags.map(t => t.name),
            content: note.content,
        },
    });

    const { watch, control, handleSubmit, formState } = formMethods;
    const { isSubmitting } = formState;

    // --- 逻辑函数区域 (定义在 useEffect 之前) ---

    // 1. 自动保存逻辑 (防抖)
    const debouncedAutoSave = useDebouncedCallback(async (values: z.infer<typeof formSchema>) => {
        // 如果正在手动提交或已成功，不执行自动保存
        if (isSubmitting || isSuccess) return;

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
                router.refresh();
            } else {
                setSaveStatus("error");
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            setSaveStatus("error");
        }
    }, 1000);

    // 2. 手动提交逻辑
    const onManualSubmit = useCallback(async (values: z.infer<typeof formSchema>) => {
        if (isSuccess) return;

        // 取消可能正在进行的自动保存
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
                toast.success("笔记已更新！", {
                    description: "正在返回详情页...",
                    duration: 1500,
                });

                setTimeout(() => {
                    router.push(`/notes/${note.id}`);
                    router.refresh();
                }, 1000);

                // 人为挂起 Promise，保持按钮禁用状态直到页面跳转
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            toast.error("更新失败", { description: "请检查网络或稍后重试" });
        }
    }, [isSuccess, note.id, router, debouncedAutoSave]);

    // --- 监听区域 ---

    // 👂 监听 Ctrl+S
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

    // 👂 监听表单变化 (React Compiler 会在这里报黄字警告，直接忽略即可)
    useEffect(() => {
        // eslint-disable-next-line react-hooks/incompatible-library
        const subscription = watch((value) => {
            if (value) {
                debouncedAutoSave(value as z.infer<typeof formSchema>);
            }
        });
        return () => subscription.unsubscribe();
    }, [watch, debouncedAutoSave]);

    const isButtonDisabled = isSubmitting || isSuccess;

    return (
        <Form {...formMethods}>
            <form onSubmit={handleSubmit(onManualSubmit)} className="space-y-6 relative">

                {/* 自动保存状态指示器 */}
                <div className="absolute -top-12 right-0 flex items-center gap-2 text-sm text-gray-500 transition-all duration-500">
                    {saveStatus === "saving" && (
                        <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>自动保存中...</span>
                        </>
                    )}
                    {saveStatus === "saved" && (
                        <>
                            <Cloud className="h-3 w-3" />
                            <span>已保存 {lastSavedTime.toLocaleTimeString()}</span>
                        </>
                    )}
                    {saveStatus === "error" && (
                        <span className="text-red-500">自动保存失败</span>
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
                    <Link href={`/notes/${note.id}`}>
                        <Button variant="outline" type="button">取消</Button>
                    </Link>

                    <Button type="submit" disabled={isButtonDisabled} className="px-8 min-w-[120px] relative group">
                        {isButtonDisabled ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {isSuccess ? "跳转中..." : "保存中..."}
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