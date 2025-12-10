// app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        // 👇 在这里添加 "force-light" 类
        // 这会重置内部所有 Shadcn 组件的颜色变量（如 Input 的边框色、文字颜色等）
        <div className="force-light min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
                {children}
            </div>
        </div>
    );
}