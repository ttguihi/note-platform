'use client';

import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
    PaginationEllipsis,
} from "@/components/ui/pagination";
import { useSearchParams, usePathname } from "next/navigation";

interface PaginationControlProps {
    totalCount: number; // 总笔记数
    pageSize?: number;  // 每页显示多少条
}

export default function PaginationControl({ totalCount, pageSize = 9 }: PaginationControlProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // 1. 计算总页数
    const totalPages = Math.ceil(totalCount / pageSize);

    // 2. 获取当前页码 (默认为 1)
    const currentPage = Number(searchParams.get("page")) || 1;

    // 如果没有内容或只有 1 页，就不显示分页器
    if (totalPages <= 1) return null;

    // 🛠️ 核心工具：生成带参数的 URL
    const createPageURL = (pageNumber: number | string) => {
        const params = new URLSearchParams(searchParams);
        params.set("page", pageNumber.toString());
        return `${pathname}?${params.toString()}`;
    };

    return (
        <Pagination className="mt-8">
            <PaginationContent>
                {/* 上一页 */}
                <PaginationItem>
                    <PaginationPrevious
                        href={currentPage > 1 ? createPageURL(currentPage - 1) : "#"}
                        aria-disabled={currentPage <= 1}
                        className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                </PaginationItem>

                {/* --- 第一页 (永远显示) --- */}
                <PaginationItem>
                    <PaginationLink href={createPageURL(1)} isActive={currentPage === 1}>
                        1
                    </PaginationLink>
                </PaginationItem>

                {/* 左省略号：如果当前页大于 3，说明 1 和当前页中间至少隔了一个 2，需要省略号 */}
                {currentPage > 3 && (
                    <PaginationItem>
                        <PaginationEllipsis />
                    </PaginationItem>
                )}

                {/* --- 👈 左邻居 (当前页的前一页) --- */}
                {/* 只有当它不是第一页时才显示 */}
                {currentPage > 2 && (
                    <PaginationItem>
                        <PaginationLink href={createPageURL(currentPage - 1)}>
                            {currentPage - 1}
                        </PaginationLink>
                    </PaginationItem>
                )}

                {/* --- 📍 当前页 (如果不是第一页也不是最后一页) --- */}
                {currentPage !== 1 && currentPage !== totalPages && (
                    <PaginationItem>
                        <PaginationLink href={createPageURL(currentPage)} isActive>
                            {currentPage}
                        </PaginationLink>
                    </PaginationItem>
                )}

                {/* --- 👉 右邻居 (当前页的后一页) --- */}
                {/* 只有当它不是最后一页时才显示 */}
                {currentPage < totalPages - 1 && (
                    <PaginationItem>
                        <PaginationLink href={createPageURL(currentPage + 1)}>
                            {currentPage + 1}
                        </PaginationLink>
                    </PaginationItem>
                )}

                {/* 右省略号：如果当前页离最后一页还远，显示省略号 */}
                {currentPage < totalPages - 2 && (
                    <PaginationItem>
                        <PaginationEllipsis />
                    </PaginationItem>
                )}

                {/* --- 最后一页 (永远显示) --- */}
                {totalPages > 1 && (
                    <PaginationItem>
                        <PaginationLink href={createPageURL(totalPages)} isActive={currentPage === totalPages}>
                            {totalPages}
                        </PaginationLink>
                    </PaginationItem>
                )}

                {/* 下一页 */}
                <PaginationItem>
                    <PaginationNext
                        href={currentPage < totalPages ? createPageURL(currentPage + 1) : "#"}
                        aria-disabled={currentPage >= totalPages}
                        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
}