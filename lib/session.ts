// lib/session.ts
import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = process.env.SESSION_SECRET || "default-secret-key-change-it";
const encodedKey = new TextEncoder().encode(secretKey);

// 1. 创建 Session (生成 JWT 并写入 Cookie)
export async function createSession(userId: string) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天过期
    const session = await new SignJWT({ userId })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(encodedKey);

    const cookieStore = await cookies();
    cookieStore.set("session", session, {
        httpOnly: true,
        secure: true,
        expires: expiresAt,
        sameSite: "lax",
        path: "/",
    });
}

// 2. 验证 Session (从 Cookie 读取并验证)
export async function verifySession() {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;

    if (!session) return null;

    try {
        const { payload } = await jwtVerify(session, encodedKey, {
            algorithms: ["HS256"],
        });
        return payload as { userId: string };
    } catch (error) {
        return null;
    }
}

// 3. 删除 Session (退出登录)
export async function deleteSession() {
    const cookieStore = await cookies();
    cookieStore.delete("session");
}