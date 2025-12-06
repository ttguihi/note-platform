// components/title-input.tsx
'use client';

import { Input } from "@/components/ui/input";
import { ComponentProps } from "react";

export default function TitleInput(props: ComponentProps<typeof Input>) {
    return (
        <Input
            {...props}
            onKeyDown={(e) => {
                // 阻止回车提交
                if (e.key === 'Enter') {
                    e.preventDefault();
                }
            }}
        />
    );
}