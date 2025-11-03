# 安装和运行指南

## 环境要求

- Node.js >= 18.0.0
- MySQL >= 8.0
- npm 或 yarn

## 安装步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入正确的数据库连接信息：

```env
DATABASE_URL="mysql://root:password@localhost:3306/supplier_db"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
```

**⚠️ 重要：生产环境请务必更换为强密码和安全的密钥！**

### 3. 初始化数据库

生成 Prisma 客户端：

```bash
npm run db:generate
```

运行数据库迁移：

```bash
npm run db:migrate
```

可选：打开 Prisma Studio 可视化数据库：

```bash
npm run db:studio
```

### 4. 创建初始用户

在 Prisma Studio 或通过 SQL 手动创建第一个 Owner 用户：

```sql
INSERT INTO users (id, email, password_hash, role, status, created_at)
VALUES (
  UUID(),
  'admin@example.com',
  '$2b$10$YourHashedPasswordHere',  -- 使用 bcrypt 加密
  'OWNER',
  'ACTIVE',
  NOW()
);
```

或者使用 Node.js 脚本生成：

```bash
node scripts/create-admin.js
```

### 5. 运行开发服务器

**前端（端口 3000）：**
```bash
npm run dev
```

**后端（端口 3001）：**
```bash
npm run server:dev
```

### 6. 访问应用

打开浏览器访问：http://localhost:3000

使用创建的 Owner 账户登录。

## 生产部署

### 构建项目

```bash
# 构建前端
npm run build

# 构建后端
npm run server:build
```

### 运行生产服务器

```bash
# 前端
npm start

# 后端
npm run server:start
```

### Docker 部署（可选）

创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build && npm run server:build

EXPOSE 3000 3001

CMD ["sh", "-c", "npm start & npm run server:start"]
```

构建和运行：

```bash
docker build -t supplier-system .
docker run -p 3000:3000 -p 3001:3001 supplier-system
```

## 常见问题

### 数据库连接失败

1. 确认 MySQL 服务正在运行
2. 检查 `.env` 中的 DATABASE_URL 是否正确
3. 确认数据库用户有足够权限

### Prisma 迁移失败

```bash
# 重置数据库（谨慎使用，会删除所有数据）
npm run db:migrate -- --reset

# 或手动推送 schema
npm run db:push
```

### 端口被占用

修改 `.env` 中的端口配置：

```env
PORT=3000
SERVER_PORT=3001
```

## 技术支持

如遇到问题，请查看：
- [文档](./README.md)
- [问题报告](https://github.com/yourrepo/issues)
