// app/notes/[id]/edit/page.tsx
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import EditNoteForm from "@/components/edit-note-form"; // 👈 引入新组件

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function EditNotePage(props: PageProps) {
    const params = await props.params;
    const { id } = params;

    // 1. 服务端获取数据
    const note = await prisma.note.findUnique({
        where: { id },
        include: { tags: true }, // 👈 必须加上 include，否则查不到 tags
    });
    if (!note) return notFound();

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Link href={`/notes/${id}`}>
                    <Button variant="ghost" size="icon">
                        <ChevronLeft size={20} />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">编辑笔记</h1>
            </div>

            {/* 2. 将数据传递给客户端表单组件 */}
            <EditNoteForm note={note} existingCategories={[]} />

        </div>
    );
}