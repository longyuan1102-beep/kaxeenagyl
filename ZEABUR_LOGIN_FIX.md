# Zeabur 登录失败问题解决方案

## 🔍 问题分析

从你的截图看到，Zeabur 服务显示"运行中"（Running），但登录时提示"登录失败，请稍后重试"。这通常是以下几个原因：

### 可能原因

1. **环境变量未正确配置**
   - `DATABASE_URL`：数据库连接字符串
   - `JWT_SECRET`：JWT 密钥
   - `CLIENT_URL`：前端地址（影响 CORS）
   - `SERVER_URL`：后端地址（影响 Next.js 代理）

2. **数据库未初始化或缺少数据**
   - 数据库表未创建
   - 管理员用户不存在

3. **前后端服务未正确连接**
   - Next.js 无法代理到 NestJS 后端
   - CORS 配置问题

---

## ✅ 解决方案

### 方案 1：检查 Zeabur 环境变量

在 Zeabur 控制台，进入你的服务设置，检查以下环境变量：

#### 必需的环境变量：

```env
# 数据库连接
DATABASE_URL="mysql://root:你的密码@你的数据库主机:端口/数据库名"

# JWT 密钥（至少 32 字符）
JWT_SECRET="your-production-jwt-secret-key-min-32-chars-long-random-string"

# JWT 过期时间（秒）
JWT_EXPIRES_IN="604800"

# 后端服务端口（Zeabur 自动分配，但明确指定更安全）
PORT=3000

# 客户端地址（你的前端域名）
CLIENT_URL="https://supplier-quote.zeabur.app"

# 应用环境
NODE_ENV="production"
```

**⚠️ 关键点：**
- `DATABASE_URL` 必须指向你真实的数据库
- `CLIENT_URL` 必须是 `https://supplier-quote.zeabur.app`（不含末尾斜杠）
- `JWT_SECRET` 必须设置且足够长

---

### 方案 2：检查数据库和初始化数据

#### 2.1 检查数据库是否已初始化

在 Zeabur 中，你的应用需要连接到 MySQL 数据库。如果你使用了 Zeabur 的数据库服务，确保：

1. 数据库服务正在运行
2. 数据库连接字符串正确

#### 2.2 初始化数据库和创建管理员

由于你的应用已经部署，需要通过 **Zeabur 控制台 > 服务 > 命令** 或 **文件**功能来执行数据库迁移。

**方法 A：使用 Zeabur 命令行执行**

在 Zeabur 控制台找到你的服务，进入"命令"或"日志"页面，应该能看到可以直接执行命令的终端。

执行以下命令：

```bash
# 1. 生成 Prisma 客户端
npx prisma generate --schema=./server/prisma/schema.prisma

# 2. 推送数据库结构（如果还没有）
npx prisma db push --schema=./server/prisma/schema.prisma

# 3. 创建管理员用户
ADMIN_EMAIL="admin@kaxeena.com" ADMIN_PASSWORD="t19881023" tsx scripts/create-admin.ts
```

**方法 B：通过 Zeabur 的部署钩子**

如果你的项目根目录有 `package.json`，可以添加一个脚本来在部署时自动初始化：

```json
{
  "scripts": {
    "postinstall": "npx prisma generate --schema=./server/prisma/schema.prisma",
    "zeabur:deploy": "npx prisma db push --schema=./server/prisma/schema.prisma"
  }
}
```

---

### 方案 3：检查前后端连接

你的应用架构是：
- **前端**：Next.js（端口 3000）
- **后端**：NestJS（端口 3001）

在 Zeabur 部署中，**你需要确保后端服务也正确部署**。

#### 3.1 检查 Next.js 代理配置

你的 `next.config.js` 中有这样的配置：

```js
const serverUrl = process.env.SERVER_URL || 'http://localhost:3001';
```

**在 Zeabur 部署中，这可能需要修改**。因为：

1. 如果你只有一个服务（前端），那么 Next.js 和 NestJS 应该在一起
2. 如果你有两个服务（前端和后端），需要设置 `SERVER_URL` 为后端服务的 URL

#### 3.2 推荐的 Zeabur 部署架构

**选项 A：单服务部署（推荐）**

将前后端打包到一个服务中：

1. 前端 Next.js 在端口 3000
2. 在 Next.js 中通过 API Routes 调用 NestJS，而不是通过 HTTP 代理

**选项 B：双服务部署**

如果你已经分开了前后端服务：

1. **前端服务环境变量**：设置 `SERVER_URL` 为后端服务的 URL
2. **后端服务环境变量**：设置 `CLIENT_URL` 为前端服务的 URL
3. 确保两个服务都正确部署和运行

---

### 方案 4：添加详细日志

为了诊断问题，你可以临时添加日志：

在 `server/src/auth/auth.controller.ts` 中：

```typescript
@Post('login')
async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
  console.log('登录请求:', loginDto.email); // 添加这行
  try {
    const result = await this.authService.login(loginDto);
    console.log('登录成功'); // 添加这行
    // ... 原有代码
  } catch (error) {
    console.error('登录失败:', error); // 添加这行
    throw error;
  }
}
```

然后重新部署，查看 Zeabur 的日志输出。

---

## 🎯 快速排查步骤

### 第 1 步：检查 Zeabur 日志

在 Zeabur 控制台，进入你的服务 → **日志**，查看是否有错误信息：
- 数据库连接错误
- 端口绑定错误
- 环境变量未设置错误

### 第 2 步：检查环境变量

进入 **环境变量** 页面，确认所有必需变量都已设置。

### 第 3 步：测试数据库连接

在 **文件** 或 **命令** 页面，尝试执行：

```bash
npx prisma db push --schema=./server/prisma/schema.prisma
```

如果失败，说明数据库连接有问题。

### 第 4 步：检查前端是否能访问后端

在前端访问 `https://supplier-quote.zeabur.app/api/auth/login`，查看是否有错误。

---

## 🚨 常见错误和解决

### 错误 1：CORS 错误

**原因**：`CLIENT_URL` 配置错误  
**解决**：设置为 `https://supplier-quote.zeabur.app`

### 错误 2：数据库连接失败

**原因**：`DATABASE_URL` 配置错误或数据库服务未运行  
**解决**：检查数据库服务状态和连接字符串

### 错误 3：用户不存在

**原因**：未执行 `create-admin`  
**解决**：通过 Zeabur 命令行执行创建管理员脚本

### 错误 4：Next.js 代理失败

**原因**：`SERVER_URL` 配置错误或后端服务未运行  
**解决**：检查后端服务状态和 `SERVER_URL` 配置

---

## 📞 获取更多信息

为了更好地帮助你，请提供：

1. **Zeabur 日志输出**（最后 50 行）
2. **环境变量列表**（隐藏敏感信息）
3. **服务配置**（前端/后端是分开还是合并）
4. **数据库服务状态**（运行中/已停止）

---

**现在，请按照上述步骤检查你的 Zeabur 配置，并告诉我遇到了哪个具体问题！**
