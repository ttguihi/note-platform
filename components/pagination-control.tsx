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
    totalCount: number;
    pageSize?: number;
}

export default function PaginationControl({ totalCount, pageSize = 9 }: PaginationControlProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const totalPages = Math.ceil(totalCount / pageSize);

    // 增加安全性：确保当前页不小于1，也不大于总页数
    const rawPage = Number(searchParams.get("page")) || 1;
    const currentPage = Math.max(1, Math.min(rawPage, totalPages));

    if (totalPages <= 1) return null;

    const createPageURL = (pageNumber: number | string) => {
        const params = new URLSearchParams(searchParams);
        params.set("page", pageNumber.toString());
        return `${pathname}?${params.toString()}`;
    };

    // --- 渲染逻辑 ---

    return (
        <Pagination className="mt-8">
            <PaginationContent>
                {/* 上一页 */}
                <PaginationItem>
                    <PaginationPrevious
                        href={currentPage > 1 ? createPageURL(currentPage - 1) : "#"}
                        aria-disabled={currentPage <= 1}
                        // 样式优化：禁用时不但不能点，还要看着像禁用的
                        className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                </PaginationItem>

                {/* --- 第一页 --- */}
                {/* 在超小屏幕(手机)下隐藏，除非它是当前页 */}
                <PaginationItem className="hidden sm:block">
                    <PaginationLink href={createPageURL(1)} isActive={currentPage === 1}>
                        1
                    </PaginationLink>
                </PaginationItem>

                {/* --- 左省略号 --- */}
                {currentPage > 3 && (
                    <PaginationItem className="hidden sm:block">
                        <PaginationEllipsis />
                    </PaginationItem>
                )}

                {/* --- 左邻居 --- */}
                {currentPage > 2 && (
                    <PaginationItem className="hidden sm:block">
                        <PaginationLink href={createPageURL(currentPage - 1)}>
                            {currentPage - 1}
                        </PaginationLink>
                    </PaginationItem>
                )}

                {/* --- 当前页 (如果不是第一页也不是最后一页) --- */}
                {/* 手机端核心：始终显示当前页，哪怕它是中间页 */}
                {currentPage !== 1 && currentPage !== totalPages && (
                    <PaginationItem>
                        <PaginationLink href={createPageURL(currentPage)} isActive>
                            {currentPage}
                        </PaginationLink>
                    </PaginationItem>
                )}

                {/* --- 右邻居 --- */}
                {currentPage < totalPages - 1 && (
                    <PaginationItem className="hidden sm:block">
                        <PaginationLink href={createPageURL(currentPage + 1)}>
                            {currentPage + 1}
                        </PaginationLink>
                    </PaginationItem>
                )}

                {/* --- 右省略号 --- */}
                {currentPage < totalPages - 2 && (
                    <PaginationItem className="hidden sm:block">
                        <PaginationEllipsis />
                    </PaginationItem>
                )}

                {/* --- 最后一页 --- */}
                {totalPages > 1 && (
                    <PaginationItem className="hidden sm:block">
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