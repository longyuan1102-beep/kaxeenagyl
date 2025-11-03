import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 配置
  app.enableCors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Cookie 解析
  app.use(cookieParser());

  // 静态资源：提供 /uploads 目录
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const absUploadDir = path.resolve(uploadDir);
  fs.mkdirSync(absUploadDir, { recursive: true });
  app.use('/uploads', express.static(absUploadDir));

  // API 前缀
  app.setGlobalPrefix('api');

  const port = process.env.SERVER_PORT || 3001;
  await app.listen(port);
  console.log(`🚀 服务器运行在 http://localhost:${port}`);
  console.log(`📦 静态上传目录: ${absUploadDir} => /uploads`);
}

bootstrap();