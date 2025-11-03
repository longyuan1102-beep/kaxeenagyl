import { IsString, IsOptional, IsEnum, IsIn } from 'class-validator';

export class UpdateSupplierDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  contact?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  // 新增银行与类别字段
  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankAccountName?: string;

  @IsString()
  @IsOptional()
  bankAccountNumber?: string;

  @IsString()
  @IsOptional()
  @IsIn([
    '软件系统',
    '硬件设备',
    '仓储设备',
    '干杂粮油',
    '海鲜冻品',
    '预包装食品',
    '用品用具',
    '洗涤消毒',
    '服装箱包',
    '车辆设备',
  ])
  category?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsEnum(['ENABLED', 'DISABLED'])
  @IsOptional()
  status?: 'ENABLED' | 'DISABLED';
}
