# Zeabur 部署完整指南

## 🎯 部署架构说明

你的项目架构：
- **前端**：Next.js 14（端口 3000）
- **后端**：NestJS 10（端口 3001）
- **数据库**：MySQL（Zeabur 的数据库服务）

在 Zeabur 部署时，有两种方式：

### 方式 A：单服务部署（推荐）⭐

将前后端打包成一个服务，通过进程管理器同时运行。

### 方式 B：双服务部署

前后端分别部署，通过 HTTP 通信。

---

## 🚀 方式 A：单服务部署（推荐）

### 优势
- 部署简单，一个服务搞定
- 减少服务间通信开销
- 降低配置复杂度

### 步骤

#### 1. 修改 `package.json`

在根目录的 `package.json` 中添加/修改启动脚本：

```json
{
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "concurrently \"npm run frontend\" \"npm run backend\"",
    "frontend": "next start",
    "backend": "node server/dist/main",
    "build:all": "npm run build && npm run server:build",
    "prestart": "npm run build:all",
    "lint": "next lint",
    "server:dev": "cd server && npx nest start --watch",
    "server:build": "cd server && npx nest build",
    "db:generate": "prisma generate --schema=./server/prisma/schema.prisma",
    "db:migrate": "prisma migrate dev --schema=./server/prisma/schema.prisma",
    "db:push": "prisma db push --schema=./server/prisma/schema.prisma",
    "db:studio": "prisma studio --schema=./server/prisma/schema.prisma",
    "check": "node scripts/check-setup.js",
    "create-admin": "tsx scripts/create-admin.ts",
    "reset-admin": "tsx scripts/reset-admin.ts"
  },
  "dependencies": {
    "concurrently": "^8.2.0",
    // ... 其他依赖
  }
}
```

**⚠️ 重要：** 需要安装 `concurrently`：

```bash
npm install concurrently --save
```

#### 2. 修改 `next.config.js`

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // 在单服务部署中，后端在本地的 3001 端口
    const serverUrl = process.env.SERVER_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${serverUrl}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${serverUrl}/uploads/:path*`,
      },
    ];
  },
  images: {
    domains: ['localhost'],
    remotePatterns: (() => {
      try {
        const u = new URL(process.env.SERVER_URL || 'http://localhost:3001');
        return [
          {
            protocol: u.protocol.replace(':', ''),
            hostname: u.hostname,
            port: u.port || '',
            pathname: '/**',
          },
        ];
      } catch (e) {
        return [];
      }
    })(),
  },
};

module.exports = nextConfig;
```

#### 3. Zeabur 环境变量配置

在 Zeabur 控制台设置以下环境变量：

```env
# 数据库连接（Zeabur 会自动注入，或手动配置）
DATABASE_URL="mysql://用户名:密码@主机:端口/数据库名"

# JWT 密钥（至少 32 字符）
JWT_SECRET="your-production-jwt-secret-key-min-32-chars-long-random-string"

# JWT 过期时间
JWT_EXPIRES_IN="604800"

# 前端端口
PORT=3000

# 后端端口
SERVER_PORT=3001

# 后端服务 URL（单服务部署中，保持 localhost）
SERVER_URL="http://localhost:3001"

# 客户端地址（你的前端域名）
CLIENT_URL="https://supplier-quote.zeabur.app"

# 应用环境
NODE_ENV="production"

# 文件上传配置
MAX_FILE_SIZE=10485760
UPLOAD_DIR="./uploads"
```

#### 4. 添加部署前脚本

在 `package.json` 中添加 `postinstall`：

```json
{
  "scripts": {
    "postinstall": "npm run db:generate",
    "zeabur:setup": "npm run db:push && npm run create-admin"
  }
}
```

#### 5. 在 Zeabur 部署

1. 连接你的 Git 仓库
2. 选择 **Node.js** 服务
3. 等待构建完成
4. 配置环境变量
5. 通过 Zeabur 的命令行执行初始化：

```bash
npm run zeabur:setup
```

---

## 🔧 方式 B：双服务部署

### 步骤

#### 1. 创建后端服务

**后端服务配置：**

```json
{
  "name": "supplier-backend",
  "build": {
    "command": "cd server && npm run build",
    "output": "server/dist"
  },
  "start": {
    "command": "cd server && node dist/main"
  },
  "env": {
    "DATABASE_URL": "你的数据库连接",
    "JWT_SECRET": "你的密钥",
    "SERVER_PORT": "3001",
    "CLIENT_URL": "https://supplier-quote.zeabur.app",
    "NODE_ENV": "production"
  }
}
```

#### 2. 创建前端服务

**前端服务配置：**

```json
{
  "name": "supplier-frontend",
  "build": {
    "command": "npm run build",
    "output": ".next"
  },
  "start": {
    "command": "npm start"
  },
  "env": {
    "SERVER_URL": "https://你的后端域名.zeabur.app",
    "PORT": "3000",
    "NODE_ENV": "production"
  }
}
```

#### 3. 配置 Zeabur

1. **后端服务**：
   - 创建新的 Node.js 服务
   - 设置 `Root Directory` 为 `server`
   - 配置后端环境变量
   - 部署

2. **前端服务**：
   - 创建新的 Next.js 服务
   - 保持根目录
   - 配置前端环境变量（包括 `SERVER_URL` 指向后端）
   - 部署

---

## 🔍 环境变量完整列表

### 必须配置

```env
# 数据库
DATABASE_URL="mysql://..."
JWT_SECRET="至少32字符的密钥"
CLIENT_URL="https://你的域名.zeabur.app"
NODE_ENV="production"
```

### 推荐配置

```env
JWT_EXPIRES_IN="604800"
PORT="3000"
SERVER_PORT="3001"
MAX_FILE_SIZE="10485760"
UPLOAD_DIR="./uploads"
```

### 条件配置

```env
# 仅在双服务部署时需要
SERVER_URL="https://后端域名.zeabur.app"
```

---

## 🐛 常见问题和解决

### 问题 1：登录失败

**可能原因**：
- 数据库未初始化
- 管理员用户未创建
- `CLIENT_URL` 配置错误

**解决方案**：

1. 检查数据库是否已初始化：
```bash
npm run db:push
```

2. 创建管理员：
```bash
npm run create-admin
```

3. 检查 CORS 设置：
   - `CLIENT_URL` 必须完整匹配前端域名
   - 不能有末尾斜杠
   - 必须是 HTTPS（生产环境）

### 问题 2：页面 404

**可能原因**：
- Next.js 路由未正确构建
- `SERVER_URL` 配置错误

**解决方案**：

1. 检查构建日志
2. 确认 `SERVER_URL` 指向正确的后端服务

### 问题 3：静态资源加载失败

**可能原因**：
- `remotePatterns` 配置错误
- 后端未正确提供静态资源

**解决方案**：

检查 `next.config.js` 中的 `remotePatterns` 配置。

### 问题 4：数据库连接失败

**可能原因**：
- `DATABASE_URL` 配置错误
- 数据库服务未运行
- 网络隔离

**解决方案**：

1. 检查数据库服务状态
2. 验证连接字符串格式
3. 使用 Zeabur 提供的数据库服务（推荐）

---

## 📝 部署检查清单

### 部署前检查

- [ ] 代码已提交到 Git
- [ ] 所有依赖已安装
- [ ] Prisma 客户端已生成
- [ ] 构建脚本正确配置

### 部署中检查

- [ ] 构建成功
- [ ] 所有环境变量已设置
- [ ] 数据库服务已启动

### 部署后检查

- [ ] 访问前端域名，显示登录页
- [ ] 后端 API 可访问
- [ ] 数据库已初始化
- [ ] 管理员用户已创建
- [ ] 登录功能正常
- [ ] 静态资源加载正常

---

## 🎉 部署成功后

1. **测试登录**：使用创建的管理员账号登录
2. **修改密码**：登录后立即修改默认密码
3. **配置公司信息**：在"公司配置"页面设置公司抬头
4. **导入数据**：开始导入供应商和产品数据

---

## 📞 获取帮助

如果遇到问题，请提供：
1. **Zeabur 日志**（最后 100 行）
2. **环境变量列表**（隐藏敏感信息）
3. **错误截图**
4. **部署方式**（单服务/双服务）

---

**祝部署顺利！** 🚀
