import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { ProductsModule } from './products/products.module';
import { QuotesModule } from './quotes/quotes.module';
import { CompanyModule } from './company/company.module';
import { ImportModule } from './import/import.module';
import { AuditModule } from './audit/audit.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    SuppliersModule,
    ProductsModule,
    QuotesModule,
    CompanyModule,
    ImportModule,
    AuditModule,
    StatsModule,
  ],
})
export class AppModule {}
