import { prisma } from "@/lib/prisma";
import NoteCard from "@/components/note-card";
import PaginationControl from "@/components/pagination-control";
import { Prisma } from "@prisma/client";

interface NoteListProps {
    userId: string;
    searchParams: {
        category?: string;
        tag?: string;
        query?: string;
        page?: string;
    };
}

export default async function NoteList({ userId, searchParams }: NoteListProps) {
    // --- 分页配置 ---
    const currentPage = Number(searchParams.page) || 1;
    const pageSize = 9;
    const skip = (currentPage - 1) * pageSize;

    // --- 构建过滤条件 ---

    // 只能查我自己的笔记
    const whereCondition: Prisma.NoteWhereInput = { userId };

    // 添加筛选条件
    if (searchParams.category) whereCondition.category = searchParams.category;
    if (searchParams.tag) whereCondition.tags = { some: { name: searchParams.tag } };
    if (searchParams.query) {
        // 模糊搜索!!! 并设置大小写不敏感
        const q = searchParams.query;
        whereCondition.OR = [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } },
        ];
    }

    // --- 执行慢查询 (并行查询) ---
    // 这里的延迟会被 Suspense 捕获，显示骨架屏
    // 并行查询笔记和笔记总数
    const [notes, totalCount] = await prisma.$transaction([

        // 提交筛选部分并配置相关规则
        prisma.note.findMany({
            where: whereCondition,
            orderBy: { createdAt: "desc" },
            include: { tags: true },
            skip: skip,
            take: pageSize,
        }),
        prisma.note.count({ where: whereCondition }),
    ]);

    const isFiltering = searchParams.category || searchParams.tag || searchParams.query;

    return (
        <div className="flex flex-col h-full">
            {/* 列表区域 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 min-h-[300px]">
                {notes.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 bg-slate-50/50 border border-dashed rounded-lg h-full">
                        <p className="text-lg font-medium">没有找到相关笔记</p>
                        {isFiltering && (
                            <p className="text-sm mt-2 text-muted-foreground">尝试清除筛选条件或更换关键词</p>
                        )}
                    </div>
                ) : (
                    notes.map((note) => <NoteCard key={note.id} note={note} />)
                )}
            </div>

            {/* 分页控制器 */}
            <div className="mt-8">
                <PaginationControl totalCount={totalCount} pageSize={pageSize} />
            </div>
        </div>
    )
}