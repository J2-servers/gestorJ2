import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

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
  sidebarLogoFit?: string;

  @IsOptional()
  @IsString()
  profileIconUrl?: string;

  @IsOptional()
  @IsString()
  loginLogoUrl?: string;

  @IsOptional()
  @IsString()
  loginLogoFit?: string;

  @IsOptional()
  @IsString()
  loginBackgroundUrl?: string;

  @IsOptional()
  @IsString()
  loginBackgroundPosition?: string;

  @IsOptional()
  @IsString()
  loginBrandSubtitle?: string;

  @IsOptional()
  @IsString()
  loginHeroEyebrow?: string;

  @IsOptional()
  @IsString()
  loginHeroTitle?: string;

  @IsOptional()
  @IsString()
  loginHeroText?: string;

  @IsOptional()
  @IsString()
  loginPanelEyebrow?: string;

  @IsOptional()
  @IsString()
  loginPanelTitle?: string;

  @IsOptional()
  @IsString()
  loginLoginTabText?: string;

  @IsOptional()
  @IsString()
  loginRegisterTabText?: string;

  @IsOptional()
  @IsString()
  loginSubmitText?: string;

  @IsOptional()
  @IsString()
  loginRegisterSubmitText?: string;

  @IsOptional()
  @IsString()
  loginStatusText?: string;

  @IsOptional()
  @IsString()
  adminWhatsapp?: string;

  @IsOptional()
  @IsString()
  whatsappProvider?: string;

  @IsOptional()
  @IsBoolean()
  whatsappEnabled?: boolean;

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
