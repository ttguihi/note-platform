// components/submit-button.tsx
'use client';

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function SubmitButton({ children }: { children: React.ReactNode }) {
    const { pending } = useFormStatus();

    return (
        <Button type="submit" disabled={pending} className="px-8 min-w-[120px]">
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                </>
            ) : (
                children
            )}
        </Button>
    );
}