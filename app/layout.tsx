import type { Metadata } from "next";
// ❌ 删除下面这行 (Inter 字体)
// import { Inter } from "next/font/google";s
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import NextTopLoader from 'nextjs-toploader';

// ❌ 删除下面这行
// const inter = Inter({ subsets: ["latin"] });

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
      {/* 👇 修改 className：
          1. 删掉 inter.className
          2. 加上 "font-sans antialiased" (使用系统默认无衬线字体，且抗锯齿) 
      */}
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          <NextTopLoader color="#6366f1" showSpinner={false} />

          {children}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}