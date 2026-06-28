import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpsertSupportTopicDto {
  @IsOptional()
  @IsString()
  serverId?: string;

  @IsString()
  title!: string;

  @IsString()
  category!: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  steps?: string;

  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: 'draft' | 'published' | 'archived';

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpsertSupportLinkDto {
  @IsOptional()
  @IsString()
  serverId?: string;

  @IsString()
  label!: string;

  @IsString()
  href!: string;

  @IsString()
  category!: string;

  @IsOptional()
  @IsString()
  detail?: string;

  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: 'draft' | 'published' | 'archived';

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpsertSupportServerUpdateDto {
  @IsOptional()
  @IsString()
  serverId?: string;

  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsIn(['operational', 'attention', 'maintenance', 'degraded', 'offline'])
  status?: 'operational' | 'attention' | 'maintenance' | 'degraded' | 'offline';

  @IsOptional()
  @IsString()
  impact?: string;

  @IsOptional()
  @IsString()
  actionText?: string;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
