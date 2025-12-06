// components/category-input.tsx
'use client';

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface CategoryInputProps {
    value: string;
    onChange: (value: string) => void;
    existingCategories: string[];
}

export default function CategoryInput({ value, onChange, existingCategories }: CategoryInputProps) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <Input
                placeholder="输入新分类 或 选择已有..."
                value={value || ""}
                onChange={(e) => {
                    const val = e.target.value;
                    // 🛑 实时限制：如果输入了空格，直接替换掉或者不更新
                    if (val.includes(" ")) {
                        return; // 拒绝更新（或者你可以允许输入但显示错误，这里我们选择直接禁止输入）
                    }
                    onChange(val);
                }}
                className="pr-10"
                autoComplete="off"
            />

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        role="combobox"
                        aria-expanded={open}
                        size="icon"
                        className="absolute right-0 top-0 h-full w-10 text-gray-400 hover:text-gray-900"
                    >
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="w-[200px] p-0" align="end">
                    <Command>
                        <CommandInput placeholder="搜索历史分类..." />
                        <CommandList>
                            <CommandEmpty>无相关分类</CommandEmpty>
                            <CommandGroup>
                                {existingCategories.map((category) => (
                                    <CommandItem
                                        key={category}
                                        value={category}
                                        onSelect={(currentValue) => {
                                            onChange(currentValue); // 选中后通知父组件
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === category ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {category}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}