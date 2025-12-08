// components/search-bar.tsx
'use client';

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { useEffect, useRef } from "react"; // 👈 引入 hooks

export default function SearchBar() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();
    const inputRef = useRef<HTMLInputElement>(null); // 👈 1. 创建 ref

    const defaultQuery = searchParams.get("query")?.toString();

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set("query", term);
        } else {
            params.delete("query");
        }
        replace(`${pathname}?${params.toString()}`);
    }, 300);

    // 👇 2. 监听 Ctrl+K / Cmd+K
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault(); // 阻止浏览器默认行为
                inputRef.current?.focus(); // 聚焦输入框
            }
        }
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    return (
        <div className="relative w-full max-w-sm group">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />

            <Input
                ref={inputRef} // 👈 绑定 ref
                type="search"
                placeholder="搜索标题或内容..."
                className="pl-9 pr-12 bg-white transition-all focus:ring-2 ring-blue-100" // pr-12 给右边留位置
                defaultValue={defaultQuery}
                onChange={(e) => handleSearch(e.target.value)}
            />

            {/* 👇 3. 快捷键提示徽章 (KBD 样式) */}
            <div className="absolute right-2 top-2 pointer-events-none hidden md:flex items-center gap-1">
                <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </div>
        </div>
    );
}