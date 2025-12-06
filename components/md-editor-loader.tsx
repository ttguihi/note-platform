// components/md-editor-loader.tsx
'use client'; // 👈 关键：这是一个客户端组件

import dynamic from "next/dynamic";

// 在这里定义 dynamic，因为文件顶部有了 'use client'，所以这里允许使用 ssr: false
const MdEditor = dynamic(() => import("@/components/md-editor"), {
    ssr: false,
    loading: () => <div className="h-[500px] w-full bg-slate-100 animate-pulse rounded-lg" />,
});

// 直接把 props 透传给真正的编辑器
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function MdEditorLoader(props: any) {
    return <MdEditor {...props} />;
}