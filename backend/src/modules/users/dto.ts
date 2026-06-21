import { PaymentType, UserRole, UserStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @MaxLength(190)
  email!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  // `role` e `parentId` foram removidos de propósito: a API só cria revendedores
  // vinculados ao admin atual. Admins jamais são criados via API (política 2-admins).
  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @IsOptional()
  @IsString()
  profileImageUrl?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  // Gestao de papel (GOD). O service protege o modelo 2-admins.
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  profileImageUrl?: string;
}
