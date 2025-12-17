import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import EditNoteForm from "@/components/edit-note-form";
import { verifySession } from "@/lib/session";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function EditNotePage(props: PageProps) {
    const params = await props.params;
    const { id } = params;

    // 1. 身份验证：没登录直接踢走
    const session = await verifySession();
    const userId = session?.userId;
    if (!userId) redirect("/login");

    // 2. ⚡ 性能优化：并行查询 (笔记详情 + 分类列表)
    const [note, categoriesData] = await Promise.all([
        // 查询笔记
        prisma.note.findUnique({
            where: { id },
            include: { tags: true },
        }),
        // 查询分类 (用于自动补全)
        prisma.note.findMany({
            where: {
                userId,
                category: { not: null }
            },
            select: { category: true },
            distinct: ['category'],
            orderBy: { category: 'asc' }
        })
    ]);

    // 3. 处理 404
    if (!note) return notFound();

    // 4. 🚨 安全防线：禁止偷看别人的笔记 (IDOR 防御)
    if (note.userId !== userId) {
        redirect("/"); // 或者返回一个 403 组件
    }

    // 5. 数据清洗
    const existingCategories = categoriesData
        .map(c => c.category)
        .filter((c): c is string => c !== null);

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            <div className="flex items-center gap-4 mb-6">
                {/* 修改：返回到该笔记的详情页，而不是列表页，体验更好 */}
                <Link href={`/notes/${id}`}>
                    <Button variant="ghost" size="icon">
                        <ChevronLeft size={20} />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">编辑笔记</h1>
            </div>

            <EditNoteForm
                note={note}
                existingCategories={existingCategories}
            />
        </div>
    );
}