import {
  Controller,
  Get,
  Put,
  Body,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { CompanyService } from './company.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';

@Controller('company-profile')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  getProfile() {
    return this.companyService.getProfile();
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  updateProfile(@Body() updateDto: UpdateCompanyProfileDto, @User() user: any) {
    return this.companyService.updateProfile(updateDto, user.id);
  }

  @Post('logo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = process.env.UPLOAD_DIR || './uploads';
          fs.mkdirSync(uploadDir, { recursive: true });
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname || '') || '';
          const base = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
          cb(null, `${base}${ext}`);
        },
      }),
    }),
  )
  updateLogo(@UploadedFile() file: Express.Multer.File, @User() user: any) {
    const logoUrl = `/uploads/${file.filename}`;
    return this.companyService.updateLogo(logoUrl, user.id);
  }
}
