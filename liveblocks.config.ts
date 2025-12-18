"use client";

import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { Presence, Storage, UserMeta, RoomEvent } from "@/types/liveblocks";

const client = createClient({
    authEndpoint: "/api/liveblocks-auth",
});

export const {
    suspense: {
        RoomProvider,
        useRoom,
        useMyPresence,
        useUpdateMyPresence,
        useSelf,
        useOthers,
        useOthersMapped,
        useOthersConnectionIds,
        useOther,
        useBroadcastEvent,
        useEventListener,
        useErrorListener,
        useStorage,
        useHistory,
        useUndo,
        useRedo,
        useCanUndo,
        useCanRedo,
        useMutation,
        useStatus, // 👈 ✅ 补上这一行！
    },
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent>(client);