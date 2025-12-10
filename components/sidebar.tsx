import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Folder, Hash, Home } from "lucide-react";
import { verifySession } from "@/lib/session";
import { cn } from "@/lib/utils"; // 确保引入 shadcn 的 cn 工具

interface SidebarProps {
    className?: string;
}

export default async function Sidebar({ className }: SidebarProps) {
    const session = await verifySession();
    const userId = session?.userId;
    if (!userId) return null;

    // 1. 聚合查询：获取所有已使用的分类
    const categories = await prisma.note.groupBy({
        by: ['category'],
        where: { userId, category: { not: null } },
        _count: { category: true },
    });

    // 2. 获取所有已使用的标签
    const tags = await prisma.tag.findMany({
        where: {
            notes: { some: { userId } }
        },
        include: {
            _count: {
                select: { notes: { where: { userId } } }
            }
        }
    });

    // 修改点：
    // 1. 移除了 fixed width (w-64), hidden, md:block, border-r
    // 2. 添加了 h-full 以适应父容器高度
    // 3. 使用 cn() 合并外部传入的 className
    return (
        <aside className={cn("space-y-8 pb-4 h-full overflow-y-auto scrollbar-hide", className)}>
            {/* 导航 */}
            <div className="space-y-2">
                <h3 className="font-semibold text-sm text-gray-500 px-2 mb-2">发现</h3>
                <Link href="/">
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 text-sm font-medium text-slate-700">
                        <Home size={16} /> 全部笔记
                    </div>
                </Link>
            </div>

            {/* 分类列表 */}
            <div className="space-y-1">
                <h3 className="font-semibold text-sm text-gray-500 px-2 mb-2">分类</h3>
                {categories.length === 0 && <p className="px-2 text-xs text-gray-400">暂无分类</p>}
                {categories.map((c) => (
                    <Link key={c.category} href={`/?category=${c.category}`}>
                        <div className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-slate-100 text-sm text-slate-700 cursor-pointer">
                            <span className="flex items-center gap-2 truncate">
                                <Folder size={14} className="text-blue-500" />
                                {c.category}
                            </span>
                            <span className="text-xs text-gray-400">{c._count.category}</span>
                        </div>
                    </Link>
                ))}
            </div>

            {/* 标签列表 */}
            <div className="space-y-1">
                <h3 className="font-semibold text-sm text-gray-500 px-2 mb-2">标签</h3>
                <div className="flex flex-wrap gap-2 px-2">
                    {tags.length === 0 && <p className="text-xs text-gray-400">暂无标签</p>}
                    {tags.map((t) => (
                        <Link key={t.id} href={`/?tag=${t.name}`}>
                            <span className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs text-slate-600 cursor-pointer flex items-center gap-1">
                                <Hash size={10} /> {t.name}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </aside>
    );
}