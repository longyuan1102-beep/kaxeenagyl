import { IsEmail, IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(['OWNER', 'ASSISTANT'])
  @IsNotEmpty()
  role: 'OWNER' | 'ASSISTANT';

  @IsEnum(['ACTIVE', 'DISABLED'])
  @IsOptional()
  status?: 'ACTIVE' | 'DISABLED';
}
