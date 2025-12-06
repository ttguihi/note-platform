// components/note-detail-actions.tsx
'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, Loader2 } from "lucide-react";
import { deleteNote } from "@/app/actions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

// 👇 引入 Alert Dialog 相关组件
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function NoteDetailActions({ noteId }: { noteId: string }) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false); // 控制删除中的 Loading 状态

    const handleDelete = async () => {
        setIsDeleting(true); // 开始转圈

        try {
            // 1. 调用 Server Action
            await deleteNote(noteId);

            // 2. 成功提示
            toast.success("笔记已删除", {
                description: "正在返回首页...",
                duration: 1500,
            });

            // 3. 跳转
            router.push("/");
            router.refresh();

        } catch (error) {
            setIsDeleting(false); // 失败了要停止转圈
            toast.error("删除失败", {
                description: "请稍后重试",
            });
        }
    };

    return (
        <div className="flex gap-2">
            <Link href={`/notes/${noteId}/edit`}>
                <Button variant="outline" size="sm" className="gap-2">
                    <Edit size={16} /> 编辑
                </Button>
            </Link>

            {/* 👇 这是一个完整的弹窗组件结构 */}
            <AlertDialog>
                {/* Trigger: 点击这个按钮会打开弹窗 */}
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-2">
                        {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                        删除
                    </Button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>你确定要删除这条笔记吗？</AlertDialogTitle>
                        <AlertDialogDescription>
                            此操作无法撤销。这条笔记将从服务器中永久移除。
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>

                        {/* Action: 点击确认后执行 handleDelete */}
                        <AlertDialogAction
                            onClick={(e) => {
                                // 阻止默认关闭行为，让我们自己控制流程（可选，为了体验更好建议加上）
                                e.preventDefault();
                                handleDelete();
                            }}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    删除中...
                                </>
                            ) : (
                                "确认删除"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}