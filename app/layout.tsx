import type { Metadata } from "next";

import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import NextTopLoader from 'nextjs-toploader';
import { cn } from "@/lib/utils"; // 建议引入 cn 工具，如果没有这个文件，直接用字符串拼接也可以
import FontLoader from "@/components/font-loader";
// import { ThemeColorProvider } from "../provider/theme-data-provider"
export const metadata: Metadata = {
  title: "Online Knowledge Notes",
  description: "A simple note taking app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>

        {/* 👇 2. 使用封装好的客户端组件替代之前的 link 标签 */}
        <FontLoader />

      </head>
      {/* 👇 关键修改在这里：
          1. 保留了 font-sans antialiased
          2. 新增了 min-h-screen (确保背景撑满全屏)
          3. 新增了 bg-gradient-... (加上了我们要的微光渐变背景)
      */}
      <body className={cn(
        "font-sans antialiased min-h-screen",
        "bg-linear-to-br from-(--grad-start) via-(--grad-mid) to-(--grad-end)",
        // 让网页看起来有一种漫反射的光泽感
        // "bg-linear-to-br from-blue-50 via-white to-blue-100", // 亮色模式渐变
        // "dark:from-slate-950 dark:via-slate-900 dark:to-blue-950" // 暗色模式渐变
        // "bg-background text-foreground",
        "transition-all duration-500" // 加上这个可以让颜色切换更丝滑

      )}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          {/* <ThemeColorProvider> */}
          {/* ✅ 你的进度条动画在这里，完全保留 */}
          <NextTopLoader color="#6366f1" showSpinner={false} />

          {children}

          {/* ✅ 你的弹窗组件在这里，完全保留 */}
          <Toaster position="top-center" richColors />
          {/* </ThemeColorProvider> */}

        </ThemeProvider>
      </body>
    </html>
  );
}