# 🚀 开始运行项目

## ⚠️ 重要提示

**项目依赖已安装成功！** 现在需要配置数据库才能运行。

---

## 📋 运行步骤

### 第1步：创建环境变量文件

在项目根目录创建 `.env` 文件，内容如下：

```env
DATABASE_URL="mysql://root:你的密码@localhost:3306/supplier_db"
JWT_SECRET="change-me-in-production-min-32-chars-long-random-string"
JWT_EXPIRES_IN="604800"
PORT=3000
SERVER_PORT=3001
MAX_FILE_SIZE=10485760
UPLOAD_DIR="./uploads"
NODE_ENV=development
CLIENT_URL="http://localhost:3000"
```

**Windows PowerShell 创建方式：**

```powershell
# 创建文件
New-Item -Path .env -ItemType File -Force

# 然后用记事本或 VS Code 编辑填入上述内容
notepad .env
```

**或者：**
直接用文本编辑器创建 `.env` 文件并填入内容。

---

### 第2步：准备数据库

#### 选项A：使用本地 MySQL

1. 确保 MySQL 正在运行
2. 创建数据库：

```sql
mysql -u root -p
CREATE DATABASE supplier_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

3. 在 `.env` 中填入你的 MySQL 连接信息

#### 选项B：使用提供的远程数据库

你提供的连接信息：
```
mysql://root:Jjvy7bXL1CUK6ETWzw84S9hGorm3e250@hkg1.clusters.zeabur.com:32108/zeabur
```

**⚠️ 警告**：这是远程公共数据库，请小心！

可以直接在 `.env` 中使用：

```env
DATABASE_URL="mysql://root:Jjvy7bXL1CUK6ETWzw84S9hGorm3e250@hkg1.clusters.zeabur.com:32108/zeabur"
```

---

### 第3步：初始化数据库

```bash
npm run db:migrate
```

这会创建所有表结构。

---

### 第4步：创建管理员账户

```bash
npm run create-admin
```

默认创建：
- 邮箱：`admin@example.com`
- 密码：`admin123456`

**⚠️ 首次登录后请立即修改密码！**

---

### 第5步：启动应用

**打开两个终端窗口：**

#### 终端1：启动后端

```bash
npm run server:dev
```

看到 `🚀 服务器运行在 http://localhost:3001` 即成功。

#### 终端2：启动前端

```bash
npm run dev
```

看到 `Ready on http://localhost:3000` 即成功。

---

### 第6步：访问应用

浏览器打开：**http://localhost:3000**

使用管理员账户登录：
- 邮箱：`admin@example.com`
- 密码：`admin123456`

---

## 🐛 常见问题

### 问题1：数据库连接失败

**错误信息：** `P1001: Can't reach database server`

**解决方案：**
1. 检查 MySQL 是否在运行
2. 检查 `.env` 中的 `DATABASE_URL` 是否正确
3. 检查数据库用户权限

### 问题2：端口被占用

**错误信息：** `Port 3000 is already in use`

**解决方案：**
修改 `.env` 中的端口：
```env
PORT=3002
SERVER_PORT=3003
```

### 问题3：Prisma 迁移失败

**解决方案：**
```bash
# 重置数据库（会删除所有数据）
npm run db:migrate -- --reset

# 或手动推送 schema
npm run db:push
```

### 问题4：模块找不到

**解决方案：**
```bash
# 重新安装依赖
rm -rf node_modules package-lock.json
npm install
```

---

## ✅ 验证安装

运行检查脚本：

```bash
npm run check
```

如果看到 `✅ 基础配置检查通过！` 说明配置正确。

---

## 📚 更多帮助

- 详细安装：查看 [INSTALL.md](./INSTALL.md)
- 快速开始：查看 [QUICK_START.md](./QUICK_START.md)
- 生产部署：查看 [DEPLOYMENT.md](./DEPLOYMENT.md)
- 项目状态：查看 [STATUS.md](./STATUS.md)

---

## 🎉 开始使用

配置完成后，开始你的供应商管理之旅！

**项目地址：** http://localhost:3000

祝你使用愉快！ 🚀
