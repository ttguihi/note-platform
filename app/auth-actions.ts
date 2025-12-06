// app/auth-actions.ts
'use server'

import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

// 📌 注册 (修改版)
// 注意：我去掉 prevState 参数了，因为我们改为前端控制流程，不需要 useActionState 的旧状态了
export async function signup(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    if (!email || !password || !name) {
        return { error: "所有字段都是必填的" };
    }

    // 1. 检查用户是否存在
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return { error: "该邮箱已被注册" };
    }

    // 2. 密码加密
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. 创建用户
    await prisma.user.create({
        data: {
            email,
            name,
            password: hashedPassword,
        },
    });

    // ❌ 删除这一行：await createSession(user.id);  <-- 不自动登录
    // ❌ 删除这一行：redirect("/");                 <-- 不后端跳转

    // ✅ 返回成功信号
    return { success: true };
}

// ... login 和 logout 保持不变 ...
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function login(prevState: any, formData: FormData) {
    // ... 保持原来的代码不变 ...
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "请输入邮箱和密码" };
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return { error: "用户不存在或密码错误" };
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
        return { error: "用户不存在或密码错误" };
    }

    await createSession(user.id);
    redirect("/");
}

export async function logout() {
    await deleteSession();
    redirect("/login");
}