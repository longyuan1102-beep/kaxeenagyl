@echo off
chcp 65001 >nul
title 供应商管理系统 - 一键启动

echo ========================================
echo   供应商管理与报价单生成系统
echo ========================================
echo.

echo 正在检查环境...
if not exist "server\src\main.ts" (
    echo [错误] 找不到 server\src\main.ts
    pause
    exit /b 1
)

if not exist ".env" (
    echo [警告] 未找到 .env 文件，正在创建...
    (
        echo DATABASE_URL="mysql://root:Jjvy7bXL1CUK6ETWzw84S9hGorm3e250@hkg1.clusters.zeabur.com:32108/zeabur"
        echo JWT_SECRET="development-secret-key-change-in-production-min-32-chars"
        echo JWT_EXPIRES_IN="604800"
        echo PORT=3000
        echo SERVER_PORT=3001
        echo NODE_ENV=development
    ) > .env
    echo [成功] .env 文件已创建
)

echo.
echo ========================================
echo   注意：需要同时运行前后端
echo ========================================
echo.
echo 本脚本会在新窗口中启动后端，然后启动前端
echo.
echo 请按任意键继续...
pause >nul

echo.
echo [1/2] 启动后端服务器...
start "后端服务器" cmd /k "cd /d %~dp0server && echo 后端启动中... && npx nest start --watch"

timeout /t 3 >nul

echo [2/2] 启动前端服务器...
cd /d %~dp0
echo 前端启动中...
npm run dev

pause
