// app/actions.ts
'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/session";
import { redirect } from "next/navigation";

// 获取当前登录用户ID (辅助函数)
async function getAuthUser() {
    const session = await verifySession();
    if (!session || !session.userId) {
        redirect("/login");
    }
    return session.userId;
}
function parseTags(tagsString: string) {
    if (!tagsString) return [];
    return tagsString.split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .map((name) => ({
            where: { name },
            create: { name },
        }));
}
// 📌 Action: 创建笔记
export async function createNote(formData: FormData) {
    const userId = await getAuthUser();
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const category = formData.get("category") as string; // 获取分类
    const tagsStr = formData.get("tags") as string;     // 获取标签字符串

    if (!title || !content) throw new Error("标题和内容不能为空");

    try {
        const newNote = await prisma.note.create({
            data: {
                title,
                content,
                category: category || null, // 存入分类
                userId,
                tags: {
                    connectOrCreate: parseTags(tagsStr), // ✨ 自动关联或创建标签
                },
            },
        });

        revalidatePath("/");
        return { success: true, id: newNote.id };
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        throw new Error("创建失败");
    }
}

// 📌 Action: 更新笔记
export async function updateNote(formData: FormData) {
    const userId = await getAuthUser();
    const id = formData.get("id") as string;
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const category = formData.get("category") as string;
    const tagsStr = formData.get("tags") as string;

    if (!id || !title || !content) throw new Error("缺少必要参数");

    const existingNote = await prisma.note.findUnique({ where: { id } });
    if (!existingNote || existingNote.userId !== userId) throw new Error("无权修改");

    try {
        await prisma.note.update({
            where: { id },
            data: {
                title,
                content,
                category: category || null,
                tags: {
                    // 更新逻辑：先断开所有旧标签，再重新关联新标签
                    set: [],
                    connectOrCreate: parseTags(tagsStr),
                },
            },
        });

        revalidatePath(`/notes/${id}`);
        revalidatePath("/"); // 首页也要刷新，因为侧边栏统计可能变了
        return { success: true };
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        throw new Error("更新失败");
    }
}
// 📌 Action: 删除笔记
export async function deleteNote(noteId: string) {
    const userId = await getAuthUser(); // 1. 验证登录

    // 2. 安全检查
    const existingNote = await prisma.note.findUnique({ where: { id: noteId } });

    // 如果笔记不存在，或者笔记的主人不是当前用户
    if (!existingNote || existingNote.userId !== userId) {
        throw new Error("无权删除");
    }

    await prisma.note.delete({ where: { id: noteId } });
    revalidatePath("/");
}

