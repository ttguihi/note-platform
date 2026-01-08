// components/theme-provider.tsx
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    return (
        <NextThemesProvider
            {...props}
            // ⚠️ 重点：确保这里是 data-theme，因为你的 CSS 写的是 [data-theme='rose']
            attribute="data-theme"
            defaultTheme="system"
            // enableSystem
            disableTransitionOnChange
            // 👇 把你所有的主题名字都在这里注册一遍
            themes={['light', 'rose', 'green', 'orange', 'violet']}
        >
            {children}
        </NextThemesProvider>
    )
}