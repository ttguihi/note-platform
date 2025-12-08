import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { verifySession } from "@/lib/session";
import Sidebar from "@/components/sidebar";
import SearchBar from "@/components/search-bar";
import LogoutButton from "@/components/logout-button";
import { ModeToggle } from "@/components/mode-toggle";
import { Suspense } from 'react';
import { NoteGridSkeleton } from '@/components/skeletons/note-card-skeleton'; // 注意路径
import NoteList from '@/components/note-list';

interface HomeProps {
  searchParams: Promise<{
    category?: string;
    tag?: string;
    query?: string;
    page?: string;
  }>;
}

export default async function Home(props: HomeProps) {
  // 1. 获取并解析参数 (Next.js 15 需要 await)
  const searchParams = await props.searchParams;
  const session = await verifySession();
  const userId = session?.userId;

  // 2. 快速查询：仅获取当前用户信息 (通常很快，不需要 Suspense)
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;

  // 3. 筛选状态 UI 逻辑 (不需要查库，直接根据 URL 参数判断)
  const isFiltering = searchParams.category || searchParams.tag || searchParams.query;

  return (
    <main className="max-w-6xl mx-auto p-6 min-h-screen flex flex-col">
      {/* Header - 静态渲染，立即显示 */}
      <header className="flex justify-between items-center pb-6 border-b mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">我的知识库</h1>
          {user && <p className="text-sm text-muted-foreground mt-1">你好, {user.name}</p>}
        </div>
        <div className="flex gap-3 items-center">
          <SearchBar />
          <ModeToggle />
          <LogoutButton />
          <Link href="/notes/create">
            <Button className="gap-2 shadow-sm">
              <Plus size={18} /> 新建笔记
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 gap-8">
        {/* Sidebar - 静态渲染 */}
        <Sidebar />

        <section className="flex-1 flex flex-col">
          {/* 筛选状态条 - 静态渲染，无需等待数据 */}
          {isFiltering && (
            <div className="flex items-center gap-2 mb-4 bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-md text-sm border border-blue-100 dark:border-blue-900/50 animate-in fade-in slide-in-from-top-2">
              <span className="font-semibold">当前筛选:</span>
              <div className="flex gap-2 flex-wrap">
                {searchParams.query && <span className="bg-background px-2 py-0.5 rounded border text-xs flex items-center shadow-sm">🔍 {searchParams.query}</span>}
                {searchParams.category && <span className="bg-background px-2 py-0.5 rounded border text-xs flex items-center shadow-sm">📂 {searchParams.category}</span>}
                {searchParams.tag && <span className="bg-background px-2 py-0.5 rounded border text-xs flex items-center shadow-sm"># {searchParams.tag}</span>}
              </div>
              <Link href="/" className="ml-auto">
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs hover:bg-blue-100 dark:hover:bg-blue-800">
                  <X size={14} className="mr-1" /> 清除全部
                </Button>
              </Link>
            </div>
          )}

          {/* 核心内容区 - 使用 Suspense 包裹 */}
          {/* 当 NoteList 正在查数据库时，显示 NoteGridSkeleton */}
          <Suspense key={JSON.stringify(searchParams)} fallback={<NoteGridSkeleton />}>
            {userId ? (
              <NoteList userId={userId} searchParams={searchParams} />
            ) : (
              <div className="text-center py-20 text-muted-foreground">请先登录</div>
            )}
          </Suspense>

        </section>
      </div>
    </main>
  );
}