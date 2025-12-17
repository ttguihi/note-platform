// app/api/upload/route.ts
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename') || 'image.png';

    // 1. 检查 Token
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
        return NextResponse.json(
            { error: 'BLOB_READ_WRITE_TOKEN is missing' },
            { status: 500 }
        );
    }

    if (!request.body) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    try {
        // 2. 上传到 Vercel Blob
        const blob = await put(filename, request.body, {
            access: 'public',
            token: token,
            // 👇👇👇 关键修复在这里 👇👇👇
            // 如果文件名重复，自动添加随机后缀 (例如 image-x8s7d.png)
            addRandomSuffix: true,
        });

        return NextResponse.json(blob);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error("❌ Vercel Blob Error:", error);
        return NextResponse.json({
            error: `Vercel Blob Error: ${error.message}`
        }, { status: 500 });
    }
}