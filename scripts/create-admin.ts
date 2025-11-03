import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@kaxeena.com';
  const password = process.env.ADMIN_PASSWORD || 't19881023';
  
  // 检查是否已存在
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log(`用户 ${email} 已存在`);
    process.exit(0);
  }

  // 加密密码
  const passwordHash = await bcrypt.hash(password, 10);

  // 创建管理员
  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  console.log(`✅ 管理员用户创建成功！`);
  console.log(`   邮箱: ${email}`);
  console.log(`   密码: ${password}`);
  console.log(`   角色: OWNER`);
  console.log(`   ⚠️  请务必修改默认密码！`);
}

createAdmin()
  .catch((e) => {
    console.error('创建管理员失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
