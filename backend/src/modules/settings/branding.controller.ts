import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service';

/**
 * Branding PUBLICO (sem autenticacao) — usado pela tela de login para exibir
 * o logo e o nome configurados pelo admin. NAO expoe dados sensiveis.
 */
@Controller('branding')
export class BrandingController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get() {
    return this.settings.getPublicBranding();
  }
}
