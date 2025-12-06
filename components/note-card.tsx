// components/note-card.tsx
'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type NoteProps = {
    note: {
        id: string;
        title: string;
        content: string;
        createdAt: Date;
        tags?: { name: string }[];
        category?: string | null;
    }
};

/**
 * 移除 Markdown 符号，生成笔记摘要
 */
function stripMarkdown(content: string) {
    return content
        .replace(/[#*`_~]/g, '') // 去除常见 MD 符号
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 将 [Link](url) 替换为 Link
        .replace(/!\[[^\]]*\]\([^)]+\)/g, '[图片]') // 将图片替换为 [图片]
        .replace(/\n/g, ' ') // 换行符换成空格
        .slice(0, 150); // 截取前 150 个字符
}

export default function NoteCard({ note }: NoteProps) {
    const summary = stripMarkdown(note.content);

    // 限制在底部只显示前两个标签，其余用 +N 表示
    const tagsToShow = note.tags ? note.tags.slice(0, 2) : [];

    return (
        <Link href={`/notes/${note.id}`}>
            <Card className="hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1 h-full flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-lg font-bold leading-tight line-clamp-1" title={note.title}>
                            {note.title}
                        </CardTitle>
                    </div>

                    {/* 日期显示 */}
                    <div className="text-xs text-gray-400 font-mono">
                        {format(new Date(note.createdAt), "yyyy-MM-dd")}
                    </div>
                </CardHeader>

                <CardContent className="grow">
                    {/* 只展示前 150 个字符作为预览 */}
                    <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                        {summary || "暂无内容..."}
                    </p>

                    {/* !!! 优化区域：已移除此处的重复标签和分类展示 !!!
                    */}
                </CardContent>

                <CardFooter className="pt-2 pb-4 px-6 mt-auto">
                    <div className="flex flex-wrap gap-1.5 w-full overflow-hidden h-[26px]">

                        {/* 紧凑显示分类 */}
                        {note.category && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-blue-200 text-blue-600 bg-blue-50/50">
                                {note.category}
                            </Badge>
                        )}

                        {/* 紧凑显示标签 */}
                        {tagsToShow.map(t => (
                            <Badge key={t.name} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 text-gray-500">
                                #{t.name}
                            </Badge>
                        ))}

                        {/* 如果标签太多，显示 +N */}
                        {note.tags && note.tags.length > 2 && (
                            <span className="text-[10px] text-gray-400 self-center">+{note.tags.length - 2}</span>
                        )}
                    </div>
                </CardFooter>
            </Card>
        </Link>
    );
}