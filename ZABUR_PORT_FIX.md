# ✅ 问题已找到！Zeabur 端口连接失败解决方案

## 🔍 问题确认

根据你的日志，**问题很明确**：

```
Error: connect ECONNREFUSED 127.0.0.1:3001
```

这意味着：
- 前端 Next.js 成功启动了（端口 3000）
- 前端试图连接到本地 `localhost:3001` 的后端服务
- 但是 **后端 NestJS 服务没有在运行**！

---

## 🎯 根本原因

在 Zeabur 部署中，你的项目需要**同时运行两个服务**：
1. 前端：Next.js（端口 3000）
2. 后端：NestJS（端口 3001）

但根据日志，**后端服务没有启动**，所以前端无法连接到后端 API，导致登录失败。

---

## ✅ 解决方案

在 Zeabur 中，有两种方式解决：

### 方案 A：修改启动配置（单服务，推荐）⭐

让 Zeabur 同时启动前后端。

#### 1. 修改 `package.json` 的 start 脚本

```json
{
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build && cd server && npm run build",
    "start": "concurrently \"npm run frontend\" \"npm run backend\"",
    "frontend": "next start",
    "backend": "cd server && node dist/main",
    "postinstall": "npm run db:generate"
  }
}
```

#### 2. 安装 `concurrently`

在你的 `package.json` 中添加依赖：

```json
{
  "dependencies": {
    "concurrently": "^8.2.0"
  }
}
```

或者确保它已安装（运行 `npm install`）。

#### 3. 在 Zeabur 中配置

进入 Zeabur 控制台 → 你的服务 → **设置**：
- **构建命令**：`npm run build`
- **启动命令**：`npm start`

#### 4. 环境变量

确保设置了以下环境变量：

```env
DATABASE_URL="你的数据库连接"
JWT_SECRET="你的密钥"
CLIENT_URL="https://supplier-quote.zeabur.app"
SERVER_URL="http://localhost:3001"
NODE_ENV="production"
```

---

### 方案 B：分离部署（双服务）

将前后端分成两个服务部署（更复杂，但更灵活）。

#### 前端服务配置

```
构建命令：npm run build
启动命令：npm start
环境变量：SERVER_URL="https://backend-service.zeabur.app"
```

#### 后端服务配置

1. 在 Zeabur 中创建**新服务**
2. 设置 **Root Directory** 为 `server`
3. 配置：
   ```
   构建命令：npm run build
   启动命令：node dist/main
   环境变量：CLIENT_URL="https://supplier-quote.zeabur.app"
   ```

---

## 🚀 立即修复步骤（推荐方案 A）

### 第 1 步：检查 package.json

确认你的根目录 `package.json` 有正确的脚本：

```json
{
  "scripts": {
    "build": "next build && cd server && npm run build",
    "start": "concurrently \"npm run frontend\" \"npm run backend\"",
    "frontend": "next start",
    "backend": "cd server && node dist/main",
    "postinstall": "npm run db:generate"
  }
}
```

### 第 2 步：安装 concurrently（如果缺少）

```bash
npm install concurrently --save
```

然后提交代码：

```bash
git add package.json package-lock.json
git commit -m "Add concurrently for zeabur deployment"
git push
```

### 第 3 步：在 Zeabur 重新部署

1. 进入 Zeabur 控制台
2. 找到你的服务
3. 点击 **"重新部署"** 或 **"编辑配置"**
4. 确保：
   - **构建命令**：`npm run build`
   - **启动命令**：`npm start`

### 第 4 步：初始化数据库

部署成功后，在 Zeabur 的**命令**或**终端**中执行：

```bash
# 推送数据库结构
npx prisma db push --schema=./server/prisma/schema.prisma

# 创建管理员用户
ADMIN_EMAIL="admin@kaxeena.com" ADMIN_PASSWORD="t19881023" tsx scripts/create-admin.ts
```

### 第 5 步：验证

1. 查看 Zeabur 日志，应该看到两条启动信息：
   ```
   前端：Ready on http://localhost:3000
   后端：🚀 服务器运行在 http://localhost:3001
   ```
2. 访问登录页面，尝试登录

---

## 🔍 验证成功标志

### 成功的日志应该显示：

```
# 前端启动
▲ Next.js 14.x.x
- Local: http://localhost:3000
✓ Ready in X seconds

# 后端启动
🚀 服务器运行在 http://localhost:3001
📦 静态上传目录: ./uploads => /uploads
```

### 如果看到错误：

1. **端口被占用** → 检查是否有多个服务在运行
2. **数据库连接失败** → 检查 `DATABASE_URL`
3. **Prisma 错误** → 运行 `npm run db:generate`

---

## 📝 完整的 package.json 示例

```json
{
  "name": "supplier-quote-system",
  "version": "1.0.0",
  "description": "供应商管理与报价单生成系统",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build && cd server && npm run build",
    "start": "concurrently \"npm run frontend\" \"npm run backend\"",
    "frontend": "next start",
    "backend": "cd server && node dist/main",
    "lint": "next lint",
    "server:dev": "cd server && npx nest start --watch",
    "server:build": "cd server && nest build",
    "server:start": "node server/dist/main",
    "db:generate": "prisma generate --schema=./server/prisma/schema.prisma",
    "db:migrate": "prisma migrate dev --schema=./server/prisma/schema.prisma",
    "db:push": "prisma db push --schema=./server/prisma/schema.prisma",
    "db:studio": "prisma studio --schema=./server/prisma/schema.prisma",
    "check": "node scripts/check-setup.js",
    "create-admin": "tsx scripts/create-admin.ts",
    "reset-admin": "tsx scripts/reset-admin.ts",
    "postinstall": "npm run db:generate"
  },
  "dependencies": {
    "concurrently": "^8.2.0",
    // ... 其他依赖
  }
}
```

---

## ⚠️ 重要提示

1. **必须同时运行两个进程**：前端和后端
2. **确保 `concurrently` 已安装**
3. **重新部署后必须初始化数据库**
4. **检查环境变量都正确配置**

---

## 🎯 快速检查清单

- [ ] `package.json` 有 `concurrently` 依赖
- [ ] `package.json` 的 `start` 脚本配置正确
- [ ] Zeabur 的启动命令是 `npm start`
- [ ] 环境变量都已设置
- [ ] 重新部署已完成
- [ ] 数据库已初始化
- [ ] 管理员用户已创建
- [ ] 日志显示前后端都启动成功

---

**按照上述步骤操作，应该能解决你的问题！** 🚀

如果还有问题，请提供：
1. 新的日志输出
2. Zeabur 的构建配置截图
