// components/mode-toggle.tsx
"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ModeToggle() {
    const { theme, setTheme } = useTheme()

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative h-9 w-9 overflow-hidden rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
        >
            {/* Sun (太阳):
         - rotate-0 scale-100: 默认状态（亮色模式）
         - dark:-rotate-90 dark:scale-0: 暗色模式时，逆时针转90度并缩小
         - duration-700: 动画持续 0.7秒 (慢一点能看清转圈)
      */}
            <Sun className="h-[1.2rem] w-[1.2rem] transition-all duration-700 rotate-0 scale-100 dark:-rotate-90 dark:scale-0 text-orange-500 dark:text-slate-100" />

            {/* Moon (月亮):
         - rotate-90 scale-0: 默认状态（亮色模式时是歪的且缩小的）
         - dark:rotate-0 dark:scale-100: 暗色模式时，转正并放大
      */}
            <Moon className="absolute h-[1.2rem] w-[1.2rem] transition-all duration-700 rotate-90 scale-0 dark:rotate-0 dark:scale-100 text-slate-900 dark:text-blue-400" />

            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}