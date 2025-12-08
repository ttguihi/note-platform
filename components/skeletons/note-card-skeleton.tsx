import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export function NoteCardSkeleton() {
    return (
        <Card className="flex flex-col h-full overflow-hidden border-border/50 shadow-sm">
            <CardHeader className="pb-3 space-y-2">
                {/* 标题骨架 */}
                <Skeleton className="h-6 w-3/4 rounded-md" />
                {/* 日期骨架 */}
                <Skeleton className="h-3 w-1/3 rounded-md" />
            </CardHeader>
            <CardContent className="grow py-2 space-y-3">
                {/* 内容摘要骨架 (模拟三行文本) */}
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[90%]" />
                <Skeleton className="h-4 w-[80%]" />
            </CardContent>
            <CardFooter className="pt-4 pb-4">
                {/* 标签骨架 */}
                <div className="flex gap-2">
                    <Skeleton className="h-5 w-12 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                </div>
            </CardFooter>
        </Card>
    );
}

// 导出一个网格骨架，模拟 9 个卡片同时加载
export function NoteGridSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
                <NoteCardSkeleton key={i} />
            ))}
        </div>
    );
}