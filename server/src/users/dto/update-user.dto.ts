import { IsEmail, IsEnum, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEnum(['OWNER', 'ASSISTANT'])
  @IsOptional()
  role?: 'OWNER' | 'ASSISTANT';

  @IsEnum(['ACTIVE', 'DISABLED'])
  @IsOptional()
  status?: 'ACTIVE' | 'DISABLED';
}
