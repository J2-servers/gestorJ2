import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // Branding PUBLICO (sem auth) para a tela de login: logo, fundo e nome.
  // Usa a configuracao do admin operacional (a mais antiga). Nunca lanca.
  async getPublicBranding() {
    const s = await this.prisma.settings
      .findFirst({
        orderBy: { createdAt: 'asc' },
        select: {
          companyName: true,
          loginLogoUrl: true,
          loginLogoFit: true,
          loginBackgroundUrl: true,
          loginBackgroundPosition: true,
          loginBrandSubtitle: true,
          loginHeroEyebrow: true,
          loginHeroTitle: true,
          loginHeroText: true,
          loginPanelEyebrow: true,
          loginPanelTitle: true,
          loginLoginTabText: true,
          loginRegisterTabText: true,
          loginSubmitText: true,
          loginRegisterSubmitText: true,
          loginStatusText: true,
          sidebarLogoUrl: true,
          sidebarLogoFit: true,
          faviconUrl: true,
        },
      })
      .catch(() => null);
    return {
      companyName: s?.companyName ?? 'Gestor J2',
      loginLogoUrl: s?.loginLogoUrl ?? s?.sidebarLogoUrl ?? null,
      loginLogoFit: s?.loginLogoFit ?? 'contain',
      loginBackgroundUrl: s?.loginBackgroundUrl ?? null,
      loginBackgroundPosition: s?.loginBackgroundPosition ?? 'center',
      loginBrandSubtitle: s?.loginBrandSubtitle ?? 'Central de creditos',
      loginHeroEyebrow: s?.loginHeroEyebrow ?? 'Operacao profissional',
      loginHeroTitle: s?.loginHeroTitle ?? 'Controle de recargas com presenca de central.',
      loginHeroText:
        s?.loginHeroText ??
        'Pedidos, creditos, revendedores, servidores, notificacoes e fila de atendimento em uma experiencia unica.',
      loginPanelEyebrow: s?.loginPanelEyebrow ?? 'Acesso seguro',
      loginPanelTitle: s?.loginPanelTitle ?? 'Entrar no sistema',
      loginLoginTabText: s?.loginLoginTabText ?? 'Entrar',
      loginRegisterTabText: s?.loginRegisterTabText ?? 'Novo revendedor',
      loginSubmitText: s?.loginSubmitText ?? 'Entrar agora',
      loginRegisterSubmitText: s?.loginRegisterSubmitText ?? 'Criar acesso',
      loginStatusText: s?.loginStatusText ?? 'Online',
      sidebarLogoFit: s?.sidebarLogoFit ?? 'contain',
      faviconUrl: s?.faviconUrl ?? null,
    };
  }

  getForAdmin(adminId: string) {
    return this.prisma.settings.upsert({
      where: { adminId },
      create: { adminId, companyName: 'Gestor J2' },
      update: {},
    });
  }

  async getPublicForUser(user: RequestUser) {
    let adminId: string | null | undefined =
      user.role === 'admin'
        ? user.sub
        : (await this.prisma.user.findUnique({ where: { id: user.sub }, select: { parentId: true } }))?.parentId;

    if (!adminId) {
      const fallback = await this.prisma.settings.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { adminId: true },
      });
      adminId = fallback?.adminId;
    }

    if (!adminId) return null;

    return this.prisma.settings.upsert({
      where: { adminId },
      create: { adminId, companyName: 'Gestor J2' },
      update: {},
      select: {
        id: true,
        adminId: true,
        companyName: true,
        cnpj: true,
        address: true,
        phone: true,
        email: true,
        faviconUrl: true,
        sidebarLogoUrl: true,
        sidebarLogoFit: true,
        profileIconUrl: true,
        loginLogoUrl: true,
        loginLogoFit: true,
        loginBackgroundUrl: true,
        loginBackgroundPosition: true,
        loginBrandSubtitle: true,
        loginHeroEyebrow: true,
        loginHeroTitle: true,
        loginHeroText: true,
        loginPanelEyebrow: true,
        loginPanelTitle: true,
        loginLoginTabText: true,
        loginRegisterTabText: true,
        loginSubmitText: true,
        loginRegisterSubmitText: true,
        loginStatusText: true,
        adminWhatsapp: true,
        pixKeys: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  updateForAdmin(adminId: string, dto: UpdateSettingsDto) {
    const data = Object.fromEntries(Object.entries({
      ...dto,
      pixKeys: dto.pixKeys as Prisma.InputJsonValue | undefined,
    }).filter(([, value]) => value !== undefined));

    return this.prisma.settings.upsert({
      where: { adminId },
      create: {
        adminId,
        companyName: dto.companyName || 'Gestor J2',
        cnpj: dto.cnpj,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        faviconUrl: dto.faviconUrl,
        sidebarLogoUrl: dto.sidebarLogoUrl,
        sidebarLogoFit: dto.sidebarLogoFit,
        profileIconUrl: dto.profileIconUrl,
        loginLogoUrl: dto.loginLogoUrl,
        loginLogoFit: dto.loginLogoFit,
        loginBackgroundUrl: dto.loginBackgroundUrl,
        loginBackgroundPosition: dto.loginBackgroundPosition,
        loginBrandSubtitle: dto.loginBrandSubtitle,
        loginHeroEyebrow: dto.loginHeroEyebrow,
        loginHeroTitle: dto.loginHeroTitle,
        loginHeroText: dto.loginHeroText,
        loginPanelEyebrow: dto.loginPanelEyebrow,
        loginPanelTitle: dto.loginPanelTitle,
        loginLoginTabText: dto.loginLoginTabText,
        loginRegisterTabText: dto.loginRegisterTabText,
        loginSubmitText: dto.loginSubmitText,
        loginRegisterSubmitText: dto.loginRegisterSubmitText,
        loginStatusText: dto.loginStatusText,
        adminWhatsapp: dto.adminWhatsapp,
        whatsappProvider: dto.whatsappProvider || 'evolution',
        evolutionApiUrl: dto.evolutionApiUrl,
        evolutionInstance: dto.evolutionInstance,
        evolutionApiKeyRef: dto.evolutionApiKeyRef,
        n8nWebhookUrl: dto.n8nWebhookUrl,
        fcmServerKey: dto.fcmServerKey,
        pixKeys: (dto.pixKeys || []) as Prisma.InputJsonValue,
      },
      update: data,
    });
  }
}
