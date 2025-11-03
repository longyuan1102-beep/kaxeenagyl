import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetAdmin() {
  // 目标新邮箱与密码（可用环境变量覆盖）
  const targetEmail = process.env.ADMIN_EMAIL || 'admin@kaxeena.com';
  const password = process.env.ADMIN_PASSWORD || 't19881023';
  // 兼容旧邮箱，便于迁移
  const oldEmail = process.env.ADMIN_EMAIL_OLD || 'admin@example.com';
  // 优先查找新邮箱，不存在则尝试旧邮箱
  let user = await prisma.user.findUnique({ where: { email: targetEmail } });
  if (!user) {
    user = await prisma.user.findUnique({ where: { email: oldEmail } });
  }
  if (!user) {
    console.error(`未找到用户: ${targetEmail} 或 ${oldEmail}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { email: targetEmail, passwordHash, status: 'ACTIVE' },
  });

  console.log(`✅ 已重置用户密码`);
  console.log(`   邮箱已设置为: ${targetEmail}`);
  console.log(`   新密码: ${password}`);
}

resetAdmin()
  .catch((e) => {
    console.error('重置管理员失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });