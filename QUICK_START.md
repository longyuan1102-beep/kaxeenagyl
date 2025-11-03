# 快速开始指南

## 第一步：检查环境

确保已安装：
- Node.js >= 18
- MySQL >= 8.0
- npm 或 yarn

## 第二步：克隆并安装

```bash
# 安装依赖（约需要 2-5 分钟）
npm install
```

## 第三步：配置数据库

1. 创建 `.env` 文件（如果还没有）

```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，修改数据库连接：

```env
DATABASE_URL="mysql://用户名:密码@主机:端口/数据库名"
JWT_SECRET="你的密钥（至少32字符）"
```

例如：
```env
DATABASE_URL="mysql://root:mypassword@localhost:3306/supplier_db"
JWT_SECRET="my-super-secret-jwt-key-min-32-chars-long-123456"
```

## 第四步：初始化数据库

```bash
# 生成 Prisma 客户端
npm run db:generate

# 创建数据库表
npm run db:migrate
```

## 第五步：创建管理员账户

两种方式任选其一：

### 方式1：使用脚本（推荐）

```bash
npm run create-admin
```

默认会创建：
- 邮箱：admin@example.com
- 密码：admin123456

可以通过环境变量自定义：

```bash
ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=yourpassword npm run create-admin
```

### 方式2：使用 Prisma Studio

```bash
npm run db:studio
```

在浏览器中打开，手动创建用户（记得用 bcrypt 加密密码）。

## 第六步：启动应用

**打开两个终端窗口：**

### 终端1：启动后端服务器

```bash
npm run server:dev
```

看到 `🚀 服务器运行在 http://localhost:3001` 即成功。

### 终端2：启动前端服务器

```bash
npm run dev
```

看到 `Ready on http://localhost:3000` 即成功。

## 第七步：访问应用

浏览器打开：http://localhost:3000

使用刚才创建的管理员账户登录。

## 常见问题排查

### 1. 数据库连接失败

```
Error: P1001: Can't reach database server
```

**解决：**
- 检查 MySQL 是否运行
- 检查 `.env` 中的 DATABASE_URL 是否正确
- 检查数据库用户权限

### 2. Prisma 迁移失败

```bash
# 尝试重置数据库（会删除所有数据）
npm run db:migrate -- --reset
```

### 3. 端口被占用

修改 `.env`：
```env
PORT=3002
SERVER_PORT=3003
```

### 4. 找不到模块

```bash
# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

### 5. Puppeteer 下载失败（国内网络）

```bash
# 设置镜像源
export PUPPETEER_DOWNLOAD_HOST=https://npm.taobao.org/mirrors
npm install
```

## 验证安装

运行检查脚本：

```bash
npm run check
```

如果看到 `✅ 基础配置检查通过！` 说明安装成功。

## 下一步

- 阅读 [README.md](./README.md) 了解功能
- 阅读 [INSTALL.md](./INSTALL.md) 了解详细配置
- 阅读 [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) 了解技术架构

## 需要帮助？

1. 检查控制台错误信息
2. 查看 `server/src` 日志
3. 检查数据库连接
4. 参考文档中的"常见问题"部分

祝你使用愉快！🎉
