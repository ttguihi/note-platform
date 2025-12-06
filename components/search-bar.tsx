// components/search-bar.tsx
'use client';

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

export default function SearchBar() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    // 获取 URL 里的初始值 (回显)
    const defaultQuery = searchParams.get("query")?.toString();

    // 核心防抖逻辑：用户停止输入 300ms 后执行
    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams);

        // 如果有搜索词，设置 query 参数；否则删除该参数
        if (term) {
            params.set("query", term);
        } else {
            params.delete("query");
        }

        // 重置页码 (如果有分页的话，通常搜索后要回到第一页)
        // params.set('page', '1');

        // 更新 URL，replace 不会增加浏览器历史记录堆栈，体验更好
        replace(`${pathname}?${params.toString()}`);
    }, 300);

    return (
        <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
                type="search"
                placeholder="搜索标题或内容..."
                className="pl-9 bg-white"
                defaultValue={defaultQuery} // 刷新页面后保留搜索词
                onChange={(e) => handleSearch(e.target.value)}
            />
        </div>
    );
}