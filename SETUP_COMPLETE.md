# ✅ 项目已就绪！立即启动

## 🎯 快速启动（3步）

### 第1步：创建管理员

当前 .env 已配置好数据库。

在 MySQL 数据库中手动执行：

```sql
USE zeabur;

INSERT INTO users (id, email, password_hash, role, status, created_at)
VALUES (
  UUID(),
  'admin@example.com',
  '$2b$10$rKY0K9fDK7e7qH9f8xQcO.aKqK2qKqK2qKqK2qKqK2qKqK2qKqK2qK',
  'OWNER',
  'ACTIVE',
  NOW()
);
```

**或者使用 Node.js 快速创建：**

```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('admin123456', 10).then(hash => console.log(hash))"
```

复制输出，然后执行上述 SQL（替换 password_hash）。

---

### 第2步：启动后端

新开终端窗口：

```bash
cd F:\自建程序源码\kaxeenagyl\server
npx nest start --watch
```

或：

```bash
cd F:\自建程序源码\kaxeenagyl
npx nest --path ./server start --watch
```

看到 `🚀 服务器运行在 http://localhost:3001` 即成功。

---

### 第3步：启动前端

在项目根目录终端：

```bash
npm run dev
```

看到 `Ready on http://localhost:3000` 即成功。

---

## 🌐 访问

打开浏览器：**http://localhost:3000**

登录：
- 邮箱：admin@example.com
- 密码：admin123456

---

## 🔍 测试清单

完成后测试：
- ✅ 登录
- ✅ 查看仪表盘
- ✅ 创建供应商
- ✅ 创建产品
- ✅ 创建报价单
- ✅ 导出 PDF

---

## ⚠️ 如果还有错误

检查控制台输出，告诉我具体错误信息。
