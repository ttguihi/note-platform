// app/page.tsx
import { prisma } from "@/lib/prisma";
import NoteCard from "@/components/note-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, LogOut, X } from "lucide-react";
import { verifySession } from "@/lib/session";
import { logout } from "@/app/auth-actions";
import Sidebar from "@/components/sidebar";
import SearchBar from "@/components/search-bar";
import PaginationControl from "@/components/pagination-control"; // 👈 引入分页组件

interface HomeProps {
  searchParams: Promise<{
    category?: string;
    tag?: string;
    query?: string;
    page?: string; // 👈 新增 page 参数
  }>;
}

export default async function Home(props: HomeProps) {
  const searchParams = await props.searchParams;
  const session = await verifySession();
  const userId = session?.userId;

  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;

  // --- 分页配置 ---
  const currentPage = Number(searchParams.page) || 1;
  const pageSize = 9; // 每页显示 9 条
  const skip = (currentPage - 1) * pageSize;

  // --- 构建过滤条件 ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereCondition: any = { userId };

  if (searchParams.category) whereCondition.category = searchParams.category;
  if (searchParams.tag) whereCondition.tags = { some: { name: searchParams.tag } };
  if (searchParams.query) {
    const q = searchParams.query;
    whereCondition.OR = [
      { title: { contains: q } },
      { content: { contains: q } },
    ];
  }

  // --- 执行查询 (并行查询数据和总数) ---
  const [notes, totalCount] = await prisma.$transaction([
    // 1. 查询当前页数据
    prisma.note.findMany({
      where: whereCondition,
      orderBy: { createdAt: "desc" },
      include: { tags: true },
      skip: skip, // 跳过前几页
      take: pageSize, // 只取当前页数量
    }),
    // 2. 查询符合条件的总条数 (用于计算页码)
    prisma.note.count({
      where: whereCondition,
    }),
  ]);

  const isFiltering = searchParams.category || searchParams.tag || searchParams.query;

  return (
    <main className="max-w-6xl mx-auto p-6 min-h-screen flex flex-col">
      {/* Header (保持不变) */}
      <header className="flex justify-between items-center pb-6 border-b mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">我的知识库</h1>
          {user && <p className="text-sm text-gray-500 mt-1">你好, {user.name}</p>}
        </div>
        <div className="flex gap-3 items-center">
          <SearchBar />
          <form action={logout}>
            <Button variant="ghost" size="sm" className="text-gray-500"><LogOut size={16} className="mr-2" /> 退出</Button>
          </form>
          <Link href="/notes/create"><Button className="gap-2 shadow-sm"><Plus size={18} /> 新建笔记</Button></Link>
        </div>
      </header>

      <div className="flex flex-1 gap-8">
        <Sidebar />

        <section className="flex-1 flex flex-col">
          {/* 筛选状态 (保持不变) */}
          {isFiltering && (
            <div className="flex items-center gap-2 mb-4 bg-blue-50 text-blue-700 px-3 py-2 rounded-md text-sm border border-blue-100">
              <span className="font-semibold">当前筛选:</span>
              <div className="flex gap-2">
                {searchParams.query && <span className="bg-white px-2 py-0.5 rounded border text-xs flex items-center">🔍 {searchParams.query}</span>}
                {searchParams.category && <span className="bg-white px-2 py-0.5 rounded border text-xs flex items-center">📂 {searchParams.category}</span>}
                {searchParams.tag && <span className="bg-white px-2 py-0.5 rounded border text-xs flex items-center"># {searchParams.tag}</span>}
              </div>
              <Link href="/" className="ml-auto">
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs hover:bg-blue-100"><X size={14} className="mr-1" /> 清除全部</Button>
              </Link>
            </div>
          )}

          {/* 列表区域 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {notes.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 bg-slate-50 border border-dashed rounded-lg">
                <p>没有找到相关笔记</p>
                {isFiltering && <Link href="/" className="mt-2 text-blue-600 hover:underline text-sm">清除筛选条件</Link>}
              </div>
            ) : (
              notes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))
            )}
          </div>

          {/* 👇 新增：分页控制器 (放在底部) */}
          <div className="mt-auto">
            <PaginationControl totalCount={totalCount} pageSize={pageSize} />
          </div>

        </section>
      </div>
    </main>
  );
}