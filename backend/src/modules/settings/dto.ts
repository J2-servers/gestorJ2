import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  faviconUrl?: string;

  @IsOptional()
  @IsString()
  sidebarLogoUrl?: string;

  @IsOptional()
  @IsString()
  profileIconUrl?: string;

  @IsOptional()
  @IsString()
  loginLogoUrl?: string;

  @IsOptional()
  @IsString()
  loginBackgroundUrl?: string;

  @IsOptional()
  @IsString()
  adminWhatsapp?: string;

  @IsOptional()
  @IsString()
  whatsappProvider?: string;

  @IsOptional()
  @IsString()
  evolutionApiUrl?: string;

  @IsOptional()
  @IsString()
  evolutionInstance?: string;

  @IsOptional()
  @IsString()
  evolutionApiKeyRef?: string;

  @IsOptional()
  @IsString()
  n8nWebhookUrl?: string;

  @IsOptional()
  @IsString()
  fcmServerKey?: string;

  @IsOptional()
  @IsArray()
  pixKeys?: unknown[];
}
