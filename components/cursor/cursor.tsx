import { useOther } from "@/liveblocks.config";

type Props = {
    connectionId: number;
};

export function Cursor({ connectionId }: Props) {
    // 获取该用户的光标位置和信息
    const cursor = useOther(connectionId, (user) => user.presence.cursor);
    const info = useOther(connectionId, (user) => user.info);

    if (!cursor) return null;

    const { x, y } = cursor;

    return (
        // 使用 transform 移动光标，性能更好
        <div
            className="pointer-events-none absolute top-0 left-0 z-50 transition-transform duration-100 ease-linear"
            style={{
                transform: `translateX(${x}px) translateY(${y}px)`,
            }}
        >
            {/* 鼠标箭头 SVG */}
            <svg
                className="relative -top-3 -left-3 h-5 w-5 drop-shadow-md" // 加一点阴影更立体
                viewBox="0 0 24 24"
                fill={info?.color || "#000"} // 使用用户专属颜色
                xmlns="http://www.w3.org/2000/svg"
            >
                <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z" />
            </svg>

            {/* 用户名标签 */}
            <div
                className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-bold text-white shadow-md whitespace-nowrap"
                style={{ backgroundColor: info?.color || "#000" }}
            >
                {info?.name || "Anonymous"}
            </div>
        </div>
    );
}