"use client"

import * as React from "react"
import { Check, Palette, Moon, Sun, Laptop } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu"

export function ModeToggle() {
    // 只需要这个 hook，不需要 useThemeColor 了
    const { setTheme, theme } = useTheme()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="transition-all">
                    {/* 根据当前主题动态变化图标 */}
                    <Palette className="h-[1.2rem] w-[1.2rem] text-primary" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel>主题风格</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* 1. 默认蓝 (Light) */}
                <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
                    <div className="flex items-center gap-2 w-full">
                        <div className="h-4 w-4 rounded-full bg-blue-500 border border-slate-200" />
                        <span>默认蓝</span>
                        {theme === 'light' && <Check className="ml-auto h-4 w-4" />}
                    </div>
                </DropdownMenuItem>

                {/* 2. 玫瑰 (Rose) */}
                <DropdownMenuItem onClick={() => setTheme("rose")} className="cursor-pointer">
                    <div className="flex items-center gap-2 w-full">
                        <div className="h-4 w-4 rounded-full bg-rose-500 border border-slate-200" />
                        <span>玫瑰红</span>
                        {theme === 'rose' && <Check className="ml-auto h-4 w-4" />}
                    </div>
                </DropdownMenuItem>

                {/* 3. 翡翠 (Green) */}
                <DropdownMenuItem onClick={() => setTheme("green")} className="cursor-pointer">
                    <div className="flex items-center gap-2 w-full">
                        <div className="h-4 w-4 rounded-full bg-emerald-500 border border-slate-200" />
                        <span>翡翠绿</span>
                        {theme === 'green' && <Check className="ml-auto h-4 w-4" />}
                    </div>
                </DropdownMenuItem>

                {/* 4. 橙色 (Orange) */}
                <DropdownMenuItem onClick={() => setTheme("orange")} className="cursor-pointer">
                    <div className="flex items-center gap-2 w-full">
                        <div className="h-4 w-4 rounded-full bg-orange-500 border border-slate-200" />
                        <span>活力橙</span>
                        {theme === 'orange' && <Check className="ml-auto h-4 w-4" />}
                    </div>
                </DropdownMenuItem>

                {/* 5. 紫罗兰 (Violet) */}
                <DropdownMenuItem onClick={() => setTheme("violet")} className="cursor-pointer">
                    <div className="flex items-center gap-2 w-full">
                        <div className="h-4 w-4 rounded-full bg-violet-500 border border-slate-200" />
                        <span>紫罗兰</span>
                        {theme === 'violet' && <Check className="ml-auto h-4 w-4" />}
                    </div>
                </DropdownMenuItem>



                {/* 6. 暗黑模式 (独立存在) */}


            </DropdownMenuContent>
        </DropdownMenu>
    )
}