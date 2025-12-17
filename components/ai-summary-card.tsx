// components/ai-summary-card.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { generateNoteSummary } from "@/app/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown"; // 👈 新增引入

interface AISummaryCardProps {
    noteId: string;
    initialSummary?: string | null;
}

export default function AISummaryCard({ noteId, initialSummary }: AISummaryCardProps) {
    const router = useRouter();
    const [summary, setSummary] = useState(initialSummary);
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            const result = await generateNoteSummary(noteId);

            if (result.success && result.summary) {
                setSummary(result.summary);
                toast.success("AI 摘要生成成功！");
                router.refresh(); // 刷新页面以确保数据同步到服务端组件
            } else {
                toast.error(result.message || "生成失败");
            }
        } catch (error) {
            console.error(error);
            toast.error("请求失败，请稍后重试");
        } finally {
            setIsLoading(false);
        }
    };

    // 状态 1: 如果没有摘要，显示“点击生成”的引导界面
    if (!summary && !isLoading) {
        return (
            <Card className="bg-slate-50/50 border-dashed border-slate-200 dark:bg-slate-900/20 dark:border-slate-800 transition-colors hover:bg-slate-50">
                <CardContent className="py-6 flex flex-col items-center justify-center text-center">
                    <Sparkles className="h-8 w-8 text-indigo-500 mb-2" />
                    <p className="text-sm text-muted-foreground mb-4">
                        这篇笔记太长了吗？让 AI 帮你提炼重点。
                    </p>
                    <Button
                        onClick={handleGenerate}
                        variant="outline"
                        className="gap-2 border-indigo-200 hover:bg-indigo-50 text-indigo-600 dark:border-indigo-900 dark:text-indigo-400 dark:hover:bg-indigo-950"
                    >
                        <Sparkles size={16} />
                        生成 AI 摘要
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // 状态 2: 显示 Loading 或 摘要结果
    return (
        <Card className="border-indigo-100 bg-indigo-50/30 dark:border-indigo-900/50 dark:bg-indigo-950/10">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                    <Sparkles className="h-4 w-4" />
                    AI 智能摘要
                </CardTitle>
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
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 animate-pulse">
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                        <span>正在阅读并总结您的笔记...</span>
                    </div>
                ) : (
                    /* 👇 核心修改：使用 Tailwind Typography + ReactMarkdown 渲染 */
                    <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        <article className="prose prose-sm prose-indigo dark:prose-invert max-w-none 
                            prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:text-indigo-700">
                            <ReactMarkdown>
                                {summary || ""}
                            </ReactMarkdown>
                        </article>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}