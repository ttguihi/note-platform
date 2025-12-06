// app/(auth)/register/page.tsx
'use client';

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signup } from "@/app/auth-actions";
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
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// 1. 定义更严格的注册规则
const formSchema = z.object({
    name: z.string().min(2, { message: "昵称至少需要 2 个字符" }),
    email: z.string().email({ message: "请输入有效的邮箱地址" }),
    password: z.string().min(6, { message: "密码强度不足，至少需要 6 位" }),
});

export default function RegisterPage() {
    const router = useRouter();
    const [serverError, setServerError] = useState<string>("");

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
        },
    });

    const { isSubmitting } = form.formState;

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setServerError("");

        const formData = new FormData();
        formData.append("name", values.name);
        formData.append("email", values.email);
        formData.append("password", values.password);

        try {
            const result = await signup(formData);

            if (result?.error) {
                setServerError(result.error);
                toast.error("注册失败", { description: result.error });
            } else if (result?.success) {
                toast.success("账号注册成功！", {
                    description: "即将跳转至登录页...",
                    duration: 2000,
                });
                setTimeout(() => {
                    router.push("/login");
                }, 1500);
            }
        } catch (error) {
            toast.error("系统错误", { description: "请稍后重试" });
        }
    }

    return (
        <div className="p-8 space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-slate-900">创建新账号</h1>
                <p className="text-sm text-slate-500">开启你的知识管理之旅</p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>昵称</FormLabel>
                                <FormControl>
                                    <Input placeholder="你的名字" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>邮箱</FormLabel>
                                <FormControl>
                                    <Input placeholder="name@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

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

                    {serverError && (
                        <p className="text-sm text-red-500 text-center bg-red-50 p-2 rounded">
                            {serverError}
                        </p>
                    )}

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                注册中...
                            </>
                        ) : (
                            "注册账号"
                        )}
                    </Button>
                </form>
            </Form>

            <div className="text-center text-sm">
                已有账号？
                <Link href="/login" className="text-blue-600 hover:underline ml-1">
                    去登录
                </Link>
            </div>
        </div>
    );
}