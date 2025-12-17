'use client';

import { useEffect, useState } from 'react';
import { initDB } from '@/lib/indexeddb';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Loader2 } from 'lucide-react';

export default function NoteContentViewer({ serverNote }: { serverNote: any }) {
    const [content, setContent] = useState(serverNote.content);
    const [isLocalVersion, setIsLocalVersion] = useState(false);

    useEffect(() => {
        async function checkLocalVersion() {
            try {
                const db = await initDB();
                const localNote = await db.get('notes', serverNote.id);

                // 简单的冲突检测：如果本地有数据，且本地更新时间晚于服务器时间
                // 注意：这里 serverNote.updatedAt 需要是 ISO 字符串或 Date 对象
                if (localNote && new Date(localNote.updatedAt).getTime() > new Date(serverNote.updatedAt).getTime()) {
                    console.log("检测到本地更新的版本，优先展示...");
                    setContent(localNote.content);
                    setIsLocalVersion(true);
                }
            } catch (e) {
                console.error("读取本地缓存失败", e);
            }
        }
        checkLocalVersion();
    }, [serverNote.id, serverNote.updatedAt]);

    return (
        <div className="relative">
            {isLocalVersion && (
                <div className="absolute -top-6 right-0 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    显示本地未同步版本
                </div>
            )}

            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
                components={{
                    p: ({ node, ...props }) => <div {...props} className="mb-4 last:mb-0" />
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}