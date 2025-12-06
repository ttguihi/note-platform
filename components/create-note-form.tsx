// components/create-note-form.tsx
'use client';

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

// 1. 定义验证规则
const formSchema = z.object({
    title: z.string().min(1, { message: "请输入笔记标题" }),
    // 正则限制：不能包含空白字符
    category: z.string().regex(/^\S*$/, { message: "分类不能包含空格" }).optional(),
    tags: z.array(z.string()),
    content: z.string().min(1, { message: "内容不能为空" }),
});

interface CreateNoteFormProps {
    existingCategories: string[];
}

export default function CreateNoteForm({ existingCategories }: CreateNoteFormProps) {
    const router = useRouter();

    // 2. 初始化表单
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

    // 3. 提交处理
    async function onSubmit(values: z.infer<typeof formSchema>) {
        const formData = new FormData();
        formData.append("title", values.title);
        formData.append("content", values.content);
        formData.append("category", values.category || "");
        formData.append("tags", values.tags.join(",")); // 将数组转回字符串传给后端

        try {
            const result = await createNote(formData);
            if (result?.success) {
                toast.success("笔记创建成功！", {
                    description: "正在跳转回首页...",
                    duration: 2000,
                });
                setTimeout(() => {
                    router.push("/");
                    router.refresh();
                }, 1000);
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            toast.error("创建失败", { description: "请稍后重试" });
        }
    }

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
                                <FormMessage /> {/* 👈 这里会显示漂亮的红字错误 */}
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
                                        {/* 使用受控的 CategoryInput */}
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
                                        {/* 使用受控的 TagInput */}
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
                                    {/* MdEditorLoader 需要支持受控模式 */}
                                    {/* 我们之前写的是 defaultValue/name 模式，这里直接传 value/onChange 给它内部的 textarea 也可以，或者我们简单点，手动在这里处理 */}
                                    {/* 为了简单适配 RHF，我们用 value/onChange 覆盖原来的 logic */}
                                    <div className="border rounded-md">
                                        <MdEditorLoader
                                            name="content"
                                            value={field.value}      // 👈 RHF 的当前值
                                            onChange={field.onChange} // 👈 RHF 的更新函数
                                            placeholder="在此处开始你的创作..."
                                        />
                                        {/* ⚠️ 注意：由于 MdEditor 是比较复杂的富文本/Textarea 封装 */}
                                        {/* 建议修改 components/md-editor.tsx 让它接收 value 和 onChange */}
                                    </div>
                                </FormControl>
                                {/* 这里的 FormMessage 暂时可能捕捉不到 MdEditor 的变化，因为它是非受控的 */}
                                {/* 为了完美，我们需要一个受控的 MdEditor，见下文补充步骤 */}
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="flex justify-end gap-4">
                        <Link href="/">
                            <Button variant="outline" type="button">取消</Button>
                        </Link>
                        <Button type="submit" disabled={isSubmitting} className="px-8 min-w-[120px]">
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    保存中...
                                </>
                            ) : "保存发布"}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}