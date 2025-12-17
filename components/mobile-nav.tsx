"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default function MobileNav({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2 md:hidden">
                    <Menu className="h-6 w-6" />
                </Button>
            </SheetTrigger>

            <SheetContent side="left" className="w-[80%] sm:w-[300px] p-0">
                <div className="sr-only">
                    <SheetTitle>导航菜单</SheetTitle>
                    <SheetDescription>选择分类或标签</SheetDescription>
                </div>

                {/* 关键点：
            我们在 Sidebar 的外层包一个 div，并添加 onClick 事件。
            利用“事件冒泡”机制，当你点击 Sidebar 里面的任何 Link 时，
            点击事件会向上传递到这里，从而触发 setOpen(false) 关闭抽屉。
                */}
                <div
                    className="h-full p-4"
                    onClick={(e) => {
                        // 核心逻辑优化：
                        // 1. 获取被点击的元素
                        const target = e.target as HTMLElement;

                        // 2. 检查点击的是否是链接 (a 标签) 或者 链接内部的元素 (比如图标)
                        // closest('a') 会向上查找最近的 a 标签
                        if (target.closest('a')) {
                            setOpen(false);
                        }
                    }}
                >
                    {children}
                </div>
            </SheetContent>
        </Sheet>
    );
}