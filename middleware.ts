// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/session";

// 指定哪些路由是“公开”的（不需要登录）
const publicRoutes = ["/login", "/register"];

export default async function middleware(req: NextRequest) {
    // 1. 验证当前用户是否登录
    // 注意：middleware 不能直接调用数据库，我们只校验 Cookie 的合法性
    const path = req.nextUrl.pathname;
    const isPublicRoute = publicRoutes.includes(path);

    // 从 cookie 读取 session (这里我们需要手动解析，因为 verifySession 主要是给 Server Components 用的)
    // 为了简单，我们只检查 session cookie 是否存在。
    // 更严谨的做法是在这里用 jose 校验 JWT，但那是进阶内容。
    const cookie = req.cookies.get('session')?.value;

    // 2. 如果是受保护路由 且 没有 Token -> 跳转登录
    if (!isPublicRoute && !cookie) {
        return NextResponse.redirect(new URL("/login", req.nextUrl));
    }

    // 3. 如果已登录 且 访问登录/注册页 -> 跳转首页
    if (isPublicRoute && cookie) {
        return NextResponse.redirect(new URL("/", req.nextUrl));
    }

    return NextResponse.next();
}

// 配置匹配规则：排除静态资源、图片、API等
// 性能优化手段
// “除了 API、静态资源、图片之外，其他的请求（主要是页面 HTML 请求）才来找我”
export const config = {
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};

// Cookie 就像“会员卡”。当你登录成功时，服务器会给你发一张卡（Set-Cookie），浏览器会把它存起来。

// 以后你每次发请求（无论是刷新页面，还是点链接），浏览器都会自动把这张卡夹在请求头（Request Header）里带给服务器。

// 中间件的作用：就是那个站在门口的保安。他不需要认识你，他只看你手里有没有这张卡（Cookie）。

// 有卡 -> 放行 (NextResponse.next())。

// 没卡 -> 踢出去 (redirect).


// 生产环境必须用 jose 或 jsonwebtoken 库在 Middleware 里校验 JWT 的签名，
// 确保 Cookie 是服务器签发的，而不是用户伪造的。