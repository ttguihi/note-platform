'use client';

import { useOthers, useSelf } from "@/liveblocks.config";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function CollaborativeAvatars() {
    const users = useOthers();
    const currentUser = useSelf();
    const hasMoreUsers = users.length > 3;

    return (
        <div className="flex items-center -space-x-3 overflow-hidden py-1 pl-1">
            <TooltipProvider delayDuration={300}>
                {/* 渲染其他在线用户 */}
                {users.slice(0, 3).map(({ connectionId, info }) => {
                    return (
                        <Tooltip key={connectionId}>
                            <TooltipTrigger asChild>
                                <div className="relative w-9 h-9 rounded-full border-[3px] border-white bg-gray-100 flex items-center justify-center overflow-hidden shadow-sm hover:z-10 hover:scale-110 transition-all cursor-default group">
                                    {/* 使用 info.avatar，如果没图则显示首字母 */}
                                    {info.avatar ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={info.avatar}
                                            alt={info.name}
                                            className="w-full h-full object-cover"
                                        // 如果图片加载失败，可以放个 fallback，这里简单处理
                                        />
                                    ) : (
                                        <span className="text-xs font-bold text-gray-500">{info.name?.[0]?.toUpperCase()}</span>
                                    )}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs font-medium">
                                <p>{info.name} (正在编辑)</p>
                            </TooltipContent>
                        </Tooltip>
                    );
                })}

                {/* 如果人太多，显示 +N */}
                {hasMoreUsers && (
                    <div className="flex items-center justify-center w-9 h-9 rounded-full border-[3px] border-white bg-gray-100 text-xs text-gray-500 font-bold shadow-sm z-0">
                        +{users.length - 3}
                    </div>
                )}

                {/* 当前用户自己 (可选显示，通常不显示自己，或者放在最后) */}
                {currentUser && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="relative w-9 h-9 rounded-full border-[3px] border-white bg-indigo-50 flex items-center justify-center overflow-hidden shadow-sm z-10 hover:scale-110 transition-transform cursor-default">
                                {currentUser.info?.avatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={currentUser.info.avatar} alt="Me" className="w-full h-full object-cover opacity-90" />
                                ) : (
                                    <span className="text-xs font-bold text-indigo-600">我</span>
                                )}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs font-medium">
                            <p>我 (在线)</p>
                        </TooltipContent>
                    </Tooltip>
                )}
            </TooltipProvider>
        </div>
    );
}