// 快速检查项目配置是否正确
const fs = require('fs');
const path = require('path');

console.log('🔍 检查项目配置...\n');

const checks = [
  {
    name: '.env 文件',
    path: '.env',
    required: false,
    message: '建议创建 .env 文件配置环境变量',
  },
  {
    name: 'Prisma Schema',
    path: 'server/prisma/schema.prisma',
    required: true,
  },
  {
    name: 'NestJS 入口',
    path: 'server/src/main.ts',
    required: true,
  },
  {
    name: 'Next.js 配置',
    path: 'next.config.js',
    required: true,
  },
  {
    name: 'Package.json',
    path: 'package.json',
    required: true,
  },
];

let allPassed = true;

checks.forEach((check) => {
  const exists = fs.existsSync(check.path);
  const status = exists ? '✅' : (check.required ? '❌' : '⚠️ ');
  console.log(`${status} ${check.name}: ${exists ? '已找到' : '未找到'}`);
  if (!exists && check.message) {
    console.log(`   ${check.message}`);
  }
  if (!exists && check.required) {
    allPassed = false;
  }
});

console.log('\n');

if (allPassed) {
  console.log('✅ 基础配置检查通过！');
  console.log('\n下一步：');
  console.log('1. 运行 npm install 安装依赖');
  console.log('2. 配置 .env 文件');
  console.log('3. 运行 npm run db:generate 生成 Prisma 客户端');
  console.log('4. 运行 npm run db:migrate 初始化数据库');
  console.log('5. 创建初始管理员用户');
  console.log('6. 运行 npm run dev 和 npm run server:dev 启动开发服务器');
} else {
  console.log('❌ 部分必需文件缺失，请检查项目结构');
  process.exit(1);
}
