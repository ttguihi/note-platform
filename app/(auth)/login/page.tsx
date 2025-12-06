// app/(auth)/login/page.tsx
'use client';

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod"; // 连接 Zod 和 React Hook Form
import * as z from "zod"; // 引入 Zod
import { login } from "@/app/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import Link from "next/link";
import { Loader2 } from "lucide-react";

// 1. 定义验证规则 (Schema)
const formSchema = z.object({
    email: z.string().email({ message: "请输入有效的邮箱地址" }),
    password: z.string().min(1, { message: "密码不能为空" }),
});

export default function LoginPage() {
    const [serverError, setServerError] = useState<string>("");

    // 2. 初始化表单
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    // 获取提交状态
    const { isSubmitting } = form.formState;

    // 3. 处理提交
    async function onSubmit(values: z.infer<typeof formSchema>) {
        setServerError("");

        // 为了复用之前的 Server Action，我们需要把 JSON 转回 FormData
        const formData = new FormData();
        formData.append("email", values.email);
        formData.append("password", values.password);

        const result = await login(null, formData); // 调用后端

        if (result?.error) {
            setServerError(result.error);
        }
    }

    return (
        <div className="p-8 space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-slate-900">欢迎回来</h1>
                <p className="text-sm text-slate-500">登录你的笔记账号</p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                    {/* 邮箱字段 */}
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>邮箱</FormLabel>
                                <FormControl>
                                    <Input placeholder="name@example.com" {...field} />
                                </FormControl>
                                {/* 👇 这里就是显示红字错误提示的地方 */}
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* 密码字段 */}
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>密码</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* 后端返回的通用错误 */}
                    {serverError && (
                        <p className="text-sm text-red-500 text-center bg-red-50 p-2 rounded">
                            {serverError}
                        </p>
                    )}

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                登录中...
                            </>
                        ) : (
                            "立即登录"
                        )}
                    </Button>
                </form>
            </Form>

            <div className="text-center text-sm">
                还没有账号？
                <Link href="/register" className="text-blue-600 hover:underline ml-1">
                    去注册
                </Link>
            </div>
        </div>
    );
}