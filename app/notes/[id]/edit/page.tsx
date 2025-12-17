// app/notes/[id]/edit/page.tsx
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import EditNoteForm from "@/components/edit-note-form";
import { verifySession } from "@/lib/session"; // 👈 1. 新增引入：我们需要获取当前用户

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function EditNotePage(props: PageProps) {
    const params = await props.params;
    const { id } = params;

    // 👇 2. 新增逻辑：获取当前登录用户的 ID
    const session = await verifySession();
    const userId = session?.userId;

    // 3. 服务端获取当前笔记数据 (保持不变)
    const note = await prisma.note.findUnique({
        where: { id },
        include: { tags: true },
    });

    if (!note) return notFound();

    // 👇 4. 新增逻辑：查询该用户所有的已有分类 (为了给下拉框提供选项)
    // 如果没登录(userId为空)，就返回空数组
    const categoriesData = userId ? await prisma.note.findMany({
        where: {
            userId,
            category: { not: null } // 排除空的
        },
        select: { category: true }, // 只查 category 这一列
        distinct: ['category'],     // 去重
        orderBy: { category: 'asc' }
    }) : [];

    // 把查询结果 [{category: 'A'}, {category: 'B'}] 变成简单的字符串数组 ['A', 'B']
    const existingCategories = categoriesData
        .map(c => c.category)
        .filter((c): c is string => c !== null);

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Link href={`/notes/${id}`}>
                    <Button variant="ghost" size="icon">
                        <ChevronLeft size={20} />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">编辑笔记</h1>
            </div>

            {/* 👇 5. 修改：把查出来的 existingCategories 传给表单组件 */}
            <EditNoteForm
                note={note}
                existingCategories={existingCategories}
            />
        </div>
    );
}