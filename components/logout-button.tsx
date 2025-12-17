// components/logout-button.tsx
'use client';

import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/auth-actions";
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

export default function LogoutButton() {
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    async function handleLogout() {
        setIsLoggingOut(true);
        // 调用服务端的退出逻辑
        await logout();
        // 这里不需要重置状态，因为页面即将跳转/刷新
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    // 👇 注意这里加了 !
                    className="text-gray-700 hover:text-slate-900 hover:bg-[#cfd0d4]!"
                >
                    <LogOut size={16} className="mr-2" />
                    退出
                </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>确定要退出登录吗？</AlertDialogTitle>
                    <AlertDialogDescription>
                        退出后你需要重新输入账号密码才能访问笔记。
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault(); // 阻止弹窗立即关闭，显示 Loading 状态
                            handleLogout();
                        }}
                        disabled={isLoggingOut}
                        className="bg-slate-500 hover:bg-slate-800"
                    >
                        {isLoggingOut ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                正在退出...
                            </>
                        ) : (
                            "确认退出"
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}