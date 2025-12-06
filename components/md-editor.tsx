// components/md-editor.tsx
'use client';

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MdEditorProps {
    name: string;
    placeholder?: string;
    // 👇 关键：接收外部控制的属性
    value?: string;
    onChange?: (value: string) => void;
    initialValue?: string; // 兼容旧逻辑
}

export default function MdEditor({
    name,
    placeholder,
    value,
    onChange,
    initialValue = ""
}: MdEditorProps) {

    // 🧠 核心逻辑：优先使用外部传入的 value (RHF)，如果没有则使用 initialValue
    // React Hook Form 传入的 value 可能是 undefined，所以要兜底为空字符串
    const content = value !== undefined ? value : initialValue;

    return (
        <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px] border rounded-xl overflow-hidden shadow-sm bg-white">
            {/* 隐藏 input 仅作兼容，RHF 其实不需要它 */}
            <input type="hidden" name={name} value={content} />

            {/* 顶部标题栏 */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b text-xs text-gray-500 font-medium shrink-0">
                <span className="pl-2">MARKDOWN 编辑</span>
                <span className="pr-2 md:block hidden">实时预览</span>
            </div>

            {/* 双栏布局 */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-white min-h-0">

                {/* 左侧：编辑区 */}
                <div className="h-full relative overflow-hidden">
                    <textarea
                        className="w-full h-full p-6 resize-none focus:outline-none text-sm font-mono leading-relaxed bg-transparent text-slate-800 overflow-y-auto"
                        placeholder={placeholder}
                        // 👇 绑定受控值
                        value={content}
                        // 👇 当打字时，通知 React Hook Form
                        onChange={(e) => {
                            if (onChange) {
                                onChange(e.target.value);
                            }
                        }}
                        spellCheck={false}
                    />
                </div>

                {/* 右侧：预览区 */}
                <div className="h-full overflow-y-auto bg-slate-50/30 p-6">
                    <article className="prose prose-slate max-w-none prose-sm 
            prose-headings:font-bold prose-h1:text-2xl 
            prose-a:text-blue-600 hover:prose-a:underline
            prose-code:text-rose-500 prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded
            prose-pre:bg-slate-800 prose-pre:text-slate-50
            prose-img:rounded-lg prose-img:shadow-md">

                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {/* 👇 实时渲染 content */}
                            {content || "*预览区域：输入内容后即可实时查看效果...*"}
                        </ReactMarkdown>

                    </article>
                </div>
            </div>
        </div>
    );
}