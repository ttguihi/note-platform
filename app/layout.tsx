// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider"; // 👈 1. 引入

const inter = Inter({ subsets: ["latin"] });

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
      {/* 👆 注意：加 suppressHydrationWarning 是为了防止 next-themes 的水合警告 */}
      <body className={inter.className}>
        {/* 👇 2. 包裹 ThemeProvider */}
        <ThemeProvider
          attribute="class"
          defaultTheme="light" // 👈 修改这里：从 "system" 改为 "light"
          enableSystem={false} // 👈 建议改为 false，强制由用户控制，而不是跟随系统
          disableTransitionOnChange={false}
        >
          {children}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}