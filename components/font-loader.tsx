/* eslint-disable @next/next/no-page-custom-font */
// components/font-loader.tsx
'use client'; // 👈 关键：标记为客户端组件

export default function FontLoader() {
    return (
        <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

            {/* 异步加载优化：默认 print (不阻塞), 加载完切回 all */}
            <link
                href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@700&display=swap"
                rel="stylesheet"
                media="print"
                onLoad={(e) => {
                    e.currentTarget.media = 'all';
                }}
            />

            {/* 兜底方案：无 JS 环境 */}
            <noscript>
                <link
                    href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@700&display=swap"
                    rel="stylesheet"
                />
            </noscript>
        </>
    );
}