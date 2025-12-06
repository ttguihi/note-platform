// components/tag-input.tsx
'use client';

import { useState, KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { toast } from "sonner"; // 引入 Toast 提示错误

interface TagInputProps {
    value: string[];              // 👈 改成受控属性：当前标签数组
    onChange: (tags: string[]) => void; // 👈 改成受控回调
}

export default function TagInput({ value = [], onChange }: TagInputProps) {
    const [inputValue, setInputValue] = useState("");

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();

            const newTag = inputValue.trim();

            // 🛑 验证 1: 不能为空
            if (!newTag) return;

            // 🛑 验证 2: 禁止空格
            if (newTag.includes(" ")) {
                toast.warning("标签不能包含空格", { position: "top-center" });
                return;
            }

            // 🛑 验证 3: 禁止重复
            if (value.includes(newTag)) {
                toast.warning("该标签已存在", { position: "top-center" });
                setInputValue(""); // 清空输入框以便用户重试
                return;
            }

            // ✅ 验证通过：更新父组件状态
            onChange([...value, newTag]);
            setInputValue("");
        }
    };

    const removeTag = (tagToRemove: string) => {
        onChange(value.filter((tag) => tag !== tagToRemove));
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2 mb-2">
                {value.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                        {tag}
                        <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:bg-slate-200 rounded-full p-0.5"
                        >
                            <X size={12} />
                        </button>
                    </Badge>
                ))}
            </div>

            <Input
                value={inputValue}
                onChange={(e) => {
                    // 可选：在这里也可以实时禁止输入空格
                    setInputValue(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                placeholder="输入标签后按回车添加..."
                className="bg-white"
            />
        </div>
    );
}