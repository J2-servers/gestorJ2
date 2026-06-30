import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

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

export class UpdatePaymentSettingsDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['sandbox', 'production'])
  environment?: 'sandbox' | 'production';

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  priority?: number;

  @IsOptional()
  @IsString()
  pixKey?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  clientSecret?: string;

  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @IsOptional()
  @IsString()
  webhookSecret?: string;

  @IsOptional()
  @IsString()
  certificate?: string;

  @IsOptional()
  @IsString()
  agency?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  depixAddress?: string;

  @IsOptional()
  @IsString()
  depixSplitAddress?: string;

  @IsOptional()
  splitFee?: number;

  @IsOptional()
  delayDepixInHours?: number;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountLabel?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsBoolean()
  autoApprove?: boolean;
}
