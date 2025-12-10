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
import { NoteGridSkeleton } from '@/components/skeletons/note-card-skeleton';
import NoteList from '@/components/note-list';
import MobileNav from "@/components/mobile-nav"; // 1. 引入新组件

interface HomeProps {
  searchParams: Promise<{
    category?: string;
    tag?: string;
    query?: string;
    page?: string;
  }>;
}

export default async function Home(props: HomeProps) {
  const searchParams = await props.searchParams;
  const session = await verifySession();
  const userId = session?.userId;
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  const isFiltering = searchParams.category || searchParams.tag || searchParams.query;

  return (
    <main className="max-w-6xl mx-auto p-6 min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex flex-col justify-between pb-6 border-b mb-6 shrink-0 md:flex md:flex-row">
        <div className="mb-4 md:mb-0 flex items-start gap-3">

          {/* 2. 使用 MobileNav 组件，并传入 Sidebar */}
          <div className="mt-1 md:hidden">
            <MobileNav>
              {/* Sidebar 继续作为服务端组件运行，数据在服务器获取 */}
              <Sidebar />
            </MobileNav>
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-serif-sc">我的知识库</h1>
            {user && <p className="text-sm text-muted-foreground mt-1 font-serif-sc">你好, {user.name}</p>}
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <SearchBar />
          <ModeToggle />
          <LogoutButton />
          <Link href="/notes/create">
            <Button className="gap-2 shadow-sm">
              <Plus size={18} /> <span className="hidden sm:inline">新建笔记</span>
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 gap-8">
        {/* 桌面端 Sidebar (保持不变) */}
        <div className="hidden md:block w-64 shrink-0 border-r pr-6 h-[calc(100vh-200px)] sticky top-6">
          <Sidebar />
        </div>

        <section className="flex-1 flex flex-col">
          {/* 筛选状态条 */}
          {isFiltering && (
            <div className="flex items-center gap-2 mb-4 bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-md text-sm border border-blue-100 dark:border-blue-900/50 animate-in fade-in slide-in-from-top-2">
              <span className="font-semibold hidden sm:inline">当前筛选:</span>
              <div className="flex gap-2 flex-wrap">
                {searchParams.query && <span className="bg-background px-2 py-0.5 rounded border text-xs flex items-center shadow-sm">🔍 {searchParams.query}</span>}
                {searchParams.category && <span className="bg-background px-2 py-0.5 rounded border text-xs flex items-center shadow-sm">📂 {searchParams.category}</span>}
                {searchParams.tag && <span className="bg-background px-2 py-0.5 rounded border text-xs flex items-center shadow-sm"># {searchParams.tag}</span>}
              </div>
              <Link href="/" className="ml-auto">
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs hover:bg-blue-100 dark:hover:bg-blue-800">
                  <X size={14} className="mr-1" /> 清除
                </Button>
              </Link>
            </div>
          )}

          {/* 核心内容区 */}
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