// app/notes/create/page.tsx
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import { redirect } from "next/navigation";
import CreateNoteForm from "@/components/create-note-form"; // 👈 引入刚才拆分出来的组件

export default async function CreateNotePage() {
    // 1. 验证登录
    const session = await verifySession();
    if (!session?.userId) redirect("/login");

    // 2. 数据库查询：查出这个用户用过的所有分类
    // 使用 distinct 去重，只拿 category 字段
    const categoriesData = await prisma.note.findMany({
        where: {
            userId: session.userId,
            category: { not: null } // 排除空分类
        },
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' }
    });

    // 3. 数据清洗：把对象数组转成简单的字符串数组 ['前端', '后端', ...]
    const existingCategories = categoriesData
        .map(c => c.category)
        .filter((c): c is string => c !== null);

    // 4. 渲染子组件，并把数据传进去
    return <CreateNoteForm existingCategories={existingCategories} />;
}