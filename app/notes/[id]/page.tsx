// app/notes/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Calendar, Clock, Folder, Hash } from "lucide-react"; // 👈 新增图标
import NoteDetailActions from "@/components/note-detail-actions";
import { Badge } from "@/components/ui/badge"; // 👈 引入 Badge 组件
import AISummaryCard from "@/components/ai-summary-card"; // 👈 引入
import rehypeSanitize from 'rehype-sanitize'; // 👈 引入保镖
import rehypeRaw from 'rehype-raw';
import NoteContentViewer from "@/components/note-content-viewer";
interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function NoteDetailPage(props: PageProps) {
    const params = await props.params;
    const { id } = params;

    // 1. 修改查询：必须加上 include: { tags: true }
    const note = await prisma.note.findUnique({
        where: { id },
        include: { tags: true }, // 👈 关键！否则 tags 是空的
    });

    if (!note) {
        notFound();
    }

    return (
        <main className="max-w-4xl mx-auto p-6 space-y-8">
            {/* 顶部导航 */}
            <div className="flex justify-between items-center pb-6 border-b">
                <Link href="/">
                    <Button variant="ghost" className="gap-2 pl-0 hover:pl-2 transition-all">
                        <ChevronLeft size={20} /> 返回列表
                    </Button>
                </Link>
                <NoteDetailActions noteId={note.id} />
            </div>

            {/* 笔记头部信息 */}
            <header className="space-y-4">


                <h1 className="text-4xl font-extrabold tracking-tight text-slate-700 leading-tight font-serif-sc">
                    {note.title}
                </h1>
                {/* 分类与标签展示区 (新增) */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    {note.category && (
                        <Link href={`/?category=${note.category}`}>
                            <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100 cursor-pointer gap-1 px-3 py-1">
                                <Folder size={12} />
                                {note.category}
                            </Badge>
                        </Link>
                    )}

                    {note.tags.map((tag) => (
                        <Link key={tag.id} href={`/?tag=${tag.name}`}>
                            <Badge variant="secondary" className="text-gray-600 hover:bg-gray-200 cursor-pointer gap-1 px-3 py-1">
                                <Hash size={12} />
                                {tag.name}
                            </Badge>
                        </Link>
                    ))}
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-400">
                    <div className="flex items-center gap-1.5 ">
                        <Calendar size={14} />
                        <span className="whitespace-nowrap">发布于 {format(note.createdAt, "yyyy年MM月dd日")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock size={14} />
                        <span className="">最后编辑 {format(note.updatedAt, "yyyy-MM-dd HH:mm")}</span>
                    </div>
                </div>
            </header>
            <section className="mb-8">
                <AISummaryCard noteId={note.id} initialSummary={note.summary} />
            </section>
            {/* Markdown 内容 */}
            <article className="prose prose-slate prose-lg max-w-none 
                prose-headings:font-bold prose-h1:text-3xl 
                prose-a:text-blue-600 hover:prose-a:underline
                prose-img:rounded-xl prose-img:shadow-lg
                bg-white p-8 rounded-xl border shadow-sm relative">

                {/* 👇 使用支持离线读取的组件 */}
                <NoteContentViewer serverNote={note} />

            </article>
        </main>
    );
}