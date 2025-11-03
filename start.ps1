# 供应商管理系统启动脚本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   供应商管理与报价单生成系统" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 .env
if (-not (Test-Path .env)) {
    Write-Host "❌ 未找到 .env 文件" -ForegroundColor Red
    Write-Host "创建 .env 文件..." -ForegroundColor Yellow
    
    @'
DATABASE_URL="mysql://root:Jjvy7bXL1CUK6ETWzw84S9hGorm3e250@hkg1.clusters.zeabur.com:32108/zeabur"
JWT_SECRET="development-secret-key-change-in-production-min-32-chars"
JWT_EXPIRES_IN="604800"
PORT=3000
SERVER_PORT=3001
NODE_ENV=development
'@ | Out-File -FilePath .env -Encoding UTF8
    
    Write-Host "✅ .env 文件已创建" -ForegroundColor Green
}

# 启动说明
Write-Host ""
Write-Host "请打开两个 PowerShell 终端窗口：" -ForegroundColor Yellow
Write-Host ""
Write-Host "终端1 - 后端:" -ForegroundColor Cyan
Write-Host "  cd server" -ForegroundColor White
Write-Host "  npx nest start --watch" -ForegroundColor White
Write-Host ""
Write-Host "终端2 - 前端:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "然后浏览器打开: http://localhost:3000" -ForegroundColor Green
Write-Host ""

pause
