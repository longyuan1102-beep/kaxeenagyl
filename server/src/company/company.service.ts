import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CompanyService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getProfile() {
    let profile = await this.prisma.companyProfile.findFirst();

    if (!profile) {
      // 创建默认配置
      profile = await this.prisma.companyProfile.create({
        data: {
          nameCn: '公司名称',
          nameEn: 'Company Name',
          bankAccount: '',
          bankName: '',
          phone: '',
        },
      });
    }

    return profile;
  }

  async updateProfile(updateDto: UpdateCompanyProfileDto, userId: string) {
    let profile = await this.prisma.companyProfile.findFirst();

    if (!profile) {
      profile = await this.prisma.companyProfile.create({
        data: {
          nameCn: updateDto.nameCn || '公司名称',
          nameEn: updateDto.nameEn || 'Company Name',
          bankAccount: updateDto.bankAccount || '',
          bankName: updateDto.bankName || '',
          phone: updateDto.phone || '',
        },
      });
    } else {
      profile = await this.prisma.companyProfile.update({
        where: { id: profile.id },
        data: updateDto,
      });
    }

    await this.auditService.log({
      userId,
      action: 'UPDATE',
      entity: 'CompanyProfile',
      entityId: profile.id,
      summary: '更新公司抬头配置',
    });

    return profile;
  }

  async updateLogo(logoUrl: string, userId: string) {
    let profile = await this.prisma.companyProfile.findFirst();

    if (!profile) {
      profile = await this.prisma.companyProfile.create({
        data: {
          logoUrl,
          nameCn: '公司名称',
          nameEn: 'Company Name',
          bankAccount: '',
          bankName: '',
          phone: '',
        },
      });
    } else {
      profile = await this.prisma.companyProfile.update({
        where: { id: profile.id },
        data: { logoUrl },
      });
    }

    await this.auditService.log({
      userId,
      action: 'UPDATE',
      entity: 'CompanyProfile',
      entityId: profile.id,
      summary: '更新公司Logo',
    });

    return profile;
  }
}
