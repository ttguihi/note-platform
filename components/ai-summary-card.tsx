"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, RefreshCw, Bot } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

interface AISummaryCardProps {
    noteId: string;
    initialSummary?: string | null;
}

export default function AISummaryCard({ noteId, initialSummary }: AISummaryCardProps) {
    const router = useRouter();
    const [summary, setSummary] = useState(initialSummary || "");
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        setIsLoading(true);
        // 如果是重新生成，先清空内容
        if (summary) setSummary("");

        try {
            const response = await fetch("/api/summary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ noteId }),
            });

            if (!response.ok) throw new Error(response.statusText);

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) return;

            // 确保清空
            setSummary("");

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const text = decoder.decode(value, { stream: true });
                setSummary((prev) => prev + text);
            }

            toast.success("生成完成！");
            router.refresh();

        } catch (error) {
            console.error(error);
            toast.error("生成失败");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        // 👇 样式完全还原你提供的代码：淡紫色背景 + 靛蓝边框
        <Card className="border-indigo-100 bg-indigo-50/30 dark:border-indigo-900/50 dark:bg-indigo-950/10 mt-6 transition-all duration-500">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                {/* 左上角标题 */}
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                    <Sparkles className="h-4 w-4" />
                    AI 智能摘要
                </CardTitle>

                {/* 右上角刷新按钮：只有在有内容或加载中显示，空状态下隐藏以保持简约 */}
                {(summary || isLoading) && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-indigo-600"
                        onClick={handleGenerate}
                        disabled={isLoading}
                        title="重新生成"
                    >
                        <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
                    </Button>
                )}
            </CardHeader>

            <CardContent>
                {/* 状态 1: 初始空状态 - 简约的中间引导 */}
                {!summary && !isLoading && (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                        <p className="text-[16px] text-muted-foreground mb-3">
                            需要AI帮您总结吗? 点击按钮生成
                        </p>
                        <Button
                            onClick={handleGenerate}
                            variant="outline"
                            size="sm"
                            className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 dark:border-indigo-900 dark:text-indigo-400 dark:hover:bg-indigo-950"
                        >
                            <Bot className="h-4 w-4" />
                            开始生成
                        </Button>
                    </div>
                )}

                {/* 状态 2: 加载中 (显示 Loading 动画) */}
                {isLoading && !summary && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 animate-pulse">
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                        <span>正在阅读并总结您的笔记...</span>
                    </div>
                )}

                {/* 状态 3: 显示内容 (Markdown 渲染) */}
                {(summary || (isLoading && summary)) && (
                    <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        <article className="prose-p:indent-[2em] prose prose-sm prose-indigo dark:prose-invert max-w-none 
                            prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:text-indigo-700">
                            <ReactMarkdown>{summary}</ReactMarkdown>
                        </article>

                        {/* 打字机光标 */}
                        {isLoading && (
                            <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-indigo-500 animate-pulse" />
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}