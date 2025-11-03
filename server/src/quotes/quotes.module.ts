import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { PdfService } from './pdf.service';
import { AuditModule } from '../audit/audit.module';
import { CompanyModule } from '../company/company.module';

@Module({
  imports: [AuditModule, CompanyModule],
  controllers: [QuotesController],
  providers: [QuotesService, PdfService],
  exports: [QuotesService, PdfService],
})
export class QuotesModule {}
