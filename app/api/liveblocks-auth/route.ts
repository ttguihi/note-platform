// app/api/liveblocks-auth/route.ts
import { Liveblocks } from "@liveblocks/node";
import { NextRequest } from "next/server";
// import { verifySession } from "@/lib/session"; // 假设你有这个，或者用你自己的鉴权逻辑

// ❌ 绝对不要保留下面这行！这就是报错的元凶！
// import { UserMeta } from "@/liveblocks.config"; 

// ✅ 如果需要类型，从 types 文件引入
import { UserMeta } from "@/types/liveblocks";

const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
    // 1. 这里写你的用户鉴权逻辑，获取当前用户信息
    // const session = await verifySession();

    // 模拟一个用户（为了演示不报错，你可以先用假数据测试）
    const user = {
        id: "user-123",
        name: "测试用户",
        color: "#D583F0",
    };

    // 2. 告诉 Liveblocks 这个用户是谁
    const sessionUser = liveblocks.prepareSession(
        user.id,
        {
            userInfo: {
                name: user.name,
                // 把原来的 avatar 生成逻辑改成这个：
                avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${user.name}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
                color: user.color,
            },
        }
    );

    // 允许该用户进入所有房间
    sessionUser.allow(`*`, sessionUser.FULL_ACCESS);

    const { status, body } = await sessionUser.authorize();
    return new Response(body, { status });
}