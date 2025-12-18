// types/liveblocks.ts

// 定义 Presence（光标、打字状态）
export type Presence = {
    isTyping: boolean;
    cursor: { x: number; y: number } | null;
};

// 定义 Storage（共享数据）
export type Storage = {
    title: string;
    content: string;
};

// 定义 UserMeta（用户信息）
export type UserMeta = {
    id: string;
    info: {
        name: string;
        avatar: string;
        color: string;
    };
};

// 定义 RoomEvent（广播事件）
export type RoomEvent = {
    type: "UPDATE_FIELD";
    field: "title" | "content" | "category" | "tags";
    value: any;
};