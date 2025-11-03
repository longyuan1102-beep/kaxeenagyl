# 生产部署指南

## 前置准备

### 1. 服务器要求

- **操作系统**: Linux (Ubuntu 20.04+ / CentOS 8+)
- **内存**: 最低 2GB，推荐 4GB+
- **硬盘**: 最低 20GB
- **网络**: 稳定的公网 IP 或域名

### 2. 软件环境

```bash
# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# MySQL 8.0+
sudo apt-get install mysql-server
sudo mysql_secure_installation

# PM2 (进程管理器)
sudo npm install -g pm2
```

## 部署步骤

### 步骤 1: 上传代码

```bash
# 通过 Git
git clone https://your-repo-url/supplier-system.git
cd supplier-system

# 或通过 FTP/SFTP 上传项目文件夹
```

### 步骤 2: 安装依赖

```bash
npm install --production
npm run db:generate
```

### 步骤 3: 配置环境变量

创建生产环境 `.env`：

```env
# 数据库配置
DATABASE_URL="mysql://dbuser:StrongPassword123@localhost:3306/supplier_db"

# JWT 密钥（必须更换为强密钥）
JWT_SECRET="your-production-jwt-secret-key-min-32-chars-long-random-string"

# JWT 过期时间（秒）
JWT_EXPIRES_IN="604800"

# 服务器端口
PORT=3000
SERVER_PORT=3001

# 应用环境
NODE_ENV=production

# 客户端地址
CLIENT_URL="https://your-domain.com"

# 文件上传配置
MAX_FILE_SIZE=10485760
UPLOAD_DIR="/var/www/uploads"
```

### 步骤 4: 数据库初始化

```bash
# 创建数据库
mysql -u root -p
CREATE DATABASE supplier_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dbuser'@'localhost' IDENTIFIED BY 'StrongPassword123';
GRANT ALL PRIVILEGES ON supplier_db.* TO 'dbuser'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# 运行迁移
npm run db:migrate
```

### 步骤 5: 创建管理员

```bash
ADMIN_EMAIL=admin@yourcompany.com ADMIN_PASSWORD=YourSecurePassword npm run create-admin
```

### 步骤 6: 构建应用

```bash
# 构建前端
npm run build

# 构建后端
npm run server:build
```

### 步骤 7: 配置 Nginx

创建 `/etc/nginx/sites-available/supplier-system`：

```nginx
# 前端服务
server {
    listen 80;
    server_name your-domain.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书配置（使用 Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 前端静态文件
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 上传文件
    location /uploads {
        alias /var/www/uploads;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 安全头部
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}

# 限制文件上传大小
client_max_body_size 50M;
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/supplier-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 步骤 8: 配置 SSL 证书（Let's Encrypt）

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

设置自动续期：

```bash
sudo crontab -e
# 添加：0 3 * * * certbot renew --quiet
```

### 步骤 9: 使用 PM2 启动应用

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [
    {
      name: 'supplier-system-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/supplier-system',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 2,
      exec_mode: 'cluster',
      error_file: '/var/log/pm2/frontend-error.log',
      out_file: '/var/log/pm2/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
    {
      name: 'supplier-system-backend',
      script: './dist/main.js',
      cwd: '/var/www/supplier-system',
      env: {
        NODE_ENV: 'production',
        SERVER_PORT: 3001,
      },
      instances: 2,
      exec_mode: 'cluster',
      error_file: '/var/log/pm2/backend-error.log',
      out_file: '/var/log/pm2/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
```

启动应用：

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd
```

### 步骤 10: 配置防火墙

```bash
# UFW
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# FirewallD
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## 监控与维护

### 查看日志

```bash
# PM2 日志
pm2 logs

# 实时监控
pm2 monit

# 应用状态
pm2 status
```

### 数据库备份

创建备份脚本 `scripts/backup.sh`：

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/supplier-system"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
mysqldump -u dbuser -p supplier_db > $BACKUP_DIR/db_$DATE.sql
gzip $BACKUP_DIR/db_$DATE.sql

# 保留最近 30 天的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

设置定时任务：

```bash
chmod +x scripts/backup.sh
sudo crontab -e
# 添加：0 2 * * * /var/www/supplier-system/scripts/backup.sh
```

### 重启应用

```bash
pm2 restart all
```

### 更新部署

```bash
git pull
npm install --production
npm run db:generate
npm run build
npm run server:build
pm2 restart all
```

## 安全加固

### 1. 数据库安全

```sql
-- 禁用远程访问
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');

-- 修改默认端口
vim /etc/mysql/mysql.conf.d/mysqld.cnf
# port = 3306 改为其他端口

FLUSH PRIVILEGES;
```

### 2. 文件权限

```bash
chown -R www-data:www-data /var/www/supplier-system
chmod -R 755 /var/www/supplier-system
chmod -R 775 /var/www/uploads
```

### 3. 隐藏敏感信息

```bash
# 确保 .env 不被提交到版本控制
echo '.env' >> .gitignore

# 设置环境变量权限
chmod 600 .env
```

### 4. 限流保护

安装 Nginx 限流模块：

```nginx
# 限制 API 请求速率
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location /api {
    limit_req zone=api_limit burst=20 nodelay;
    # ... 其他配置
}
```

## 性能优化

### 1. 启用 Gzip 压缩

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
```

### 2. Redis 缓存（可选）

```bash
sudo apt-get install redis-server
```

配置会话缓存。

### 3. CDN 配置

将静态资源上传到 CDN，修改资源路径。

## 故障排查

### 查看错误日志

```bash
# PM2 日志
pm2 logs supplier-system-frontend --err
pm2 logs supplier-system-backend --err

# Nginx 日志
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# MySQL 日志
tail -f /var/log/mysql/error.log
```

### 常见问题

1. **502 Bad Gateway**: 应用未启动或端口错误
2. **500 Internal Error**: 查看应用日志
3. **数据库连接失败**: 检查 `DATABASE_URL` 配置
4. **权限被拒绝**: 检查文件权限

## 回滚方案

如果新版本有问题，快速回滚：

```bash
git checkout <previous-commit-hash>
npm install --production
npm run build
npm run server:build
pm2 restart all
```

## 支持与维护

- 定期更新依赖
- 监控系统性能
- 定期备份数据
- 关注安全漏洞
- 优化数据库查询

---

祝部署顺利！🎉
