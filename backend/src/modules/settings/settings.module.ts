import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { BrandingController } from './branding.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController, BrandingController],
  providers: [SettingsService],
})
export class SettingsModule {}
