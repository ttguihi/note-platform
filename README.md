# 📘 Online Knowledge Base (在线知识笔记平台)

[![Vercel App](https://therealsujitk-vercel-badge.vercel.app/?app=jiale-note-platform)](https://jiale-note-platform.vercel.app)

一个基于 Next.js 15 全栈开发的现代化在线知识笔记平台。支持 Markdown 写作、图片上传、多维度筛选及响应式设计，旨在提供流畅、沉浸的笔记体验。

[👉 点击查看在线演示](https://jiale-note-platform.vercel.app)

## ✨ 核心功能

- **📝 Markdown 编辑与渲染**：支持标准 Markdown 语法，实时预览。
- **📸 便捷图片上传**：
  - 支持 **Ctrl+V** 直接粘贴截图上传。
  - 移动端支持点击按钮调用系统相册上传。
  - 基于 Vercel Blob 云存储，自动生成 CDN 链接。
- **📱 全端响应式**：
  - 桌面端：沉浸式侧边栏导航。
  - 移动端：手势友好的抽屉式菜单 (Sheet)。
- **🔍 强大的筛选系统**：支持通过 **分类 (Category)**、**标签 (Tags)** 和 **搜索 (Search)** 组合过滤笔记。
- **💾 智能防丢失**：
  - 本地草稿自动保存 (Local Storage)。
  - 意外刷新或关闭页面后，自动提示恢复未保存内容。
- **🎨 现代化 UI**：
  - 基于 Shadcn/ui 的精美组件。
  - 支持深色/浅色模式 (Dark/Light Mode)。
  - 沉浸式微光渐变背景。

## 🛠️ 技术栈

- **框架**: [Next.js 15 (App Router)](https://nextjs.org)
- **语言**: TypeScript
- **数据库 ORM**: Prisma
- **样式**: Tailwind CSS
- **UI 组件库**: Shadcn/ui
- **文件存储**: Vercel Blob
- **表单管理**: React Hook Form + Zod
- **通知**: Sonner (Toast)

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone [https://github.com/ttguihi/note-platform.git](https://github.com/ttguihi/note-platform.git)
cd your-repo
```

### 2. 安装依赖
```bash
pnpm install
```

### 3. 配置环境变量
在根目录新建 .env.local 文件，并填入以下内容：

```.env.local
# 数据库连接 (示例为本地 SQLite，生产环境请换成 Postgres/MySQL)
DATABASE_URL="file:./dev.db"

# Vercel Blob 存储 (用于图片上传)
# 请在 Vercel 控制台 -> Storage -> Blob 获取 Token
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxxxxxxxxxx"

# 鉴权相关 (如果使用了 Auth)
# SESSION_SECRET="..."
```

### 4.初始化数据库
```Bash
npx prisma generate
npx prisma db push
```

### 5. 启动开发服务器
```Bash
pnpm dev
```

访问 http://localhost:3000 即可看到项目
