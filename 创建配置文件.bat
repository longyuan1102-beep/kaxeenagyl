@echo off
chcp 65001 >nul
echo 创建 .env 配置文件...

(
echo DATABASE_URL="mysql://root:Jjvy7bXL1CUK6ETWzw84S9hGorm3e250@hkg1.clusters.zeabur.com:32108/zeabur"
echo JWT_SECRET="development-secret-key-change-in-production-min-32-chars"
echo JWT_EXPIRES_IN="604800"
echo PORT=3000
echo SERVER_PORT=3001
echo NODE_ENV=development
) > .env

echo [成功] .env 文件已创建
echo.
echo 按任意键继续启动...
pause >nul

cd server
start cmd /k "echo 后端启动中... && npx nest start --watch"

cd ..
timeout /t 3 >nul

echo 前端启动中...
npm run dev

pause
