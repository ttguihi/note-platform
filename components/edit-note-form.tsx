// components/edit-note-form.tsx
'use client';

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
import { Loader2 } from "lucide-react";
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

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: note.title,
            category: note.category || "",
            // 把对象数组转回字符串数组
            tags: note.tags.map(t => t.name),
            content: note.content,
        },
    });

    const { isSubmitting } = form.formState;

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const formData = new FormData();
        formData.append("id", note.id); // 别忘了 ID
        formData.append("title", values.title);
        formData.append("content", values.content);
        formData.append("category", values.category || "");
        formData.append("tags", values.tags.join(","));

        try {
            const result = await updateNote(formData);
            if (result?.success) {
                toast.success("笔记已更新！", {
                    description: "正在返回详情页...",
                    duration: 1500,
                });
                setTimeout(() => {
                    router.push(`/notes/${note.id}`);
                    router.refresh();
                }, 1000);
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            toast.error("更新失败", { description: "请稍后重试" });
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                <FormField
                    control={form.control}
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
                        control={form.control}
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
                        control={form.control}
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
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>内容详情</FormLabel>
                            <FormControl>
                                <MdEditorLoader
                                    name="content"
                                    value={field.value}      // 👈 RHF 的当前值
                                    onChange={field.onChange} // 👈 RHF 的更新函数
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
                    <Button type="submit" disabled={isSubmitting} className="px-8">
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                保存中...
                            </>
                        ) : "保存修改"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}