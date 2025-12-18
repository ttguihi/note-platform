// app/api/summary/route.ts
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";

// 初始化 DeepSeek (兼容模式)
const deepseek = createOpenAICompatible({
    name: "deepseek",
    baseURL: "https://api.deepseek.com/v1",
    apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function POST(req: Request) {
    const session = await verifySession();
    if (!session?.userId) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { noteId } = await req.json();
    const note = await prisma.note.findUnique({
        where: { id: noteId, userId: session.userId },
    });

    if (!note || !note.content) {
        return new Response("Note not found", { status: 404 });
    }

    // ⭐ 核心优化：将 Draft 和 Polish 合并为一个强力的 System Prompt
    // 这样只需要一次调用，速度快一倍，且立刻开始流式输出
    const result = await streamText({
        model: deepseek("deepseek-chat"),
        messages: [
            {
                role: "system",
                content: `你是一个专业的知识管理专家。请直接阅读笔记并输出一份完美的摘要。
要求：
1. 提取核心观点，逻辑清晰。
2. 语言精练专业，去除口语废话。
3. 直接输出润色后的结果，不需要输出草稿。
4. 字数控制在 200 字以内。`
            },
            { role: "user", content: note.content }
        ],
        temperature: 0.3,
        // 生成完自动存库
        onFinish: async ({ text }) => {
            if (text && text.length > 0) {
                await prisma.note.update({
                    where: { id: noteId },
                    data: { summary: text },
                });
            }
        },
    });

    return result.toTextStreamResponse();
}