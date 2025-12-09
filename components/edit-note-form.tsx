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

// --- LocalStorage 工具函数 ---

const getDraftKey = (noteId: string) => `note-draft-${noteId}`;

const saveLocalDraft = (noteId: string, data: z.infer<typeof formSchema>) => {
    try {
        // 使用 window 对象前，确保在客户端环境 (虽然 use client 已经保证了，但习惯上避免直接在顶层执行)
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
        if (typeof window === 'undefined') return null; // 服务器端不读取 localStorage
        const draft = localStorage.getItem(getDraftKey(noteId));
        return draft ? formSchema.parse(JSON.parse(draft)) : null;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// --- 组件开始 ---

export default function EditNoteForm({ note, existingCategories }: EditNoteFormProps) {
    const router = useRouter();

    // 状态管理
    const [isSuccess, setIsSuccess] = useState(false);
    const initialDraft = getLocalDraft(note.id);
    const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");

    // FIX 1: Hydration 修复: lastSavedTime 初始值设为 null，避免在 SSR 时调用 new Date()
    const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
    // FIX 2: Hydration 修复: 增加 mounted 状态
    const [isMounted, setIsMounted] = useState(false);

    // 初始化表单，优先使用本地草稿
    const formMethods = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialDraft?.title ?? note.title,
            category: initialDraft?.category ?? note.category ?? "",
            tags: initialDraft?.tags ?? note.tags.map(t => t.name),
            content: initialDraft?.content ?? note.content,
        },
    });

    const { watch, control, handleSubmit, formState } = formMethods; // 修正解构方式
    const { isSubmitting } = formState;

    // FIX 3: Hydration 修复: 在客户端设置初始时间和 mounted 状态
    useEffect(() => {
        // 客户端加载后，设置 mounted 状态
        setIsMounted(true);
        // 设置初始的“已保存时间”
        setLastSavedTime(new Date());
    }, []);

    // --- 逻辑函数区域 ---

    // 1. 自动保存逻辑 (防抖)
    const debouncedAutoSave = useDebouncedCallback(async (values: z.infer<typeof formSchema>) => {
        if (isSubmitting || isSuccess) return;

        // 步骤 1: 立即保存到 LocalStorage 作为本地草稿 (离线保障)
        saveLocalDraft(note.id, values);

        setSaveStatus("saving");
        const formData = new FormData();
        formData.append("id", note.id);
        formData.append("title", values.title);
        formData.append("content", values.content);
        formData.append("category", values.category || "");
        formData.append("tags", values.tags.join(","));

        try {
            // 尝试同步到服务器
            const result = await updateNote(formData);
            if (result?.success) {
                setSaveStatus("saved");
                setLastSavedTime(new Date()); // 成功同步后更新时间
                // 步骤 2: 服务器保存成功后，清除本地草稿
                clearLocalDraft(note.id);
                router.refresh();
            } else {
                setSaveStatus("error");
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            // 步骤 3: 网络错误/离线状态
            setSaveStatus("error");
            console.warn("自动保存到服务器失败，数据已保存到本地草稿。");
        }
    }, 1000);

    // 2. 手动提交逻辑
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
                // 步骤 4: 手动提交成功，清除本地草稿
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
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            toast.error("更新失败", { description: "请检查网络或稍后重试" });
        }
    }, [isSuccess, note.id, router, debouncedAutoSave]);

    // --- 监听区域 ---

    // 👂 监听 Ctrl+S (手动同步)
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

    // 👂 监听本地草稿恢复提示
    useEffect(() => {
        if (initialDraft) {
            // 确保在客户端执行
            if (typeof window !== 'undefined') {
                const timestamp = localStorage.getItem(`${getDraftKey(note.id)}-timestamp`);
                const timeString = timestamp ? new Date(timestamp).toLocaleTimeString() : '上次编辑时';

                toast.warning("已自动恢复本地草稿！", {
                    description: `上次本地保存时间：${timeString}。`,
                    duration: 5000,
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 👂 监听表单变化 (自动保存到本地和尝试同步到云端)
    useEffect(() => {

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
                            <span>自动保存中... (本地)</span>
                        </>
                    )}
                    {saveStatus === "saved" && (
                        <>
                            <Cloud className="h-3 w-3" />
                            {/* FIX 4: 仅在客户端且时间存在时，渲染动态时间字符串 */}
                            {isMounted && lastSavedTime ? (
                                <span>云端已同步 {lastSavedTime.toLocaleTimeString()}</span>
                            ) : (
                                // 服务器端和未同步完成时渲染静态文本
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

                {/* ... (表单字段保持不变) ... */}

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