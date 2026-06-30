import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { createCipheriv, createHash, randomBytes } from 'crypto';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePaymentSettingsDto, UpdateSettingsDto } from './dto';

function encryptSecret(value: string | undefined) {
  const secret = String(value ?? '').trim();
  if (!secret) return undefined;
  const keySource = process.env.PAYMENT_SETTINGS_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!keySource) throw new BadRequestException('Defina PAYMENT_SETTINGS_ENCRYPTION_KEY para salvar credenciais sensiveis.');
  const key = createHash('sha256').update(keySource).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return `enc:v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`;
}

function text(value: unknown) {
  return String(value ?? '').trim();
}

const PAYMENT_PROVIDER_CATALOG = [
  {
    id: 'manual_pix',
    name: 'PIX manual',
    kind: 'manual',
    stability: 'Basico',
    officialDocsUrl: 'https://www.bcb.gov.br/estabilidadefinanceira/pix',
    webhookDocsUrl: '',
    requiredFields: ['pixKey', 'bankName', 'accountLabel'],
    secretFields: [],
    webhookEvents: [],
    feeSummary: 'Sem taxa do sistema. Taxas dependem da conta PIX usada.',
    contractNotes: 'Manual; nao reconhece pagamento sozinho.',
    notes: 'Operacao simples: reseller paga por PIX e o admin aprova o pedido manualmente.',
  },
  {
    id: 'depix',
    name: 'DePix App',
    kind: 'gateway',
    stability: 'Estavel',
    officialDocsUrl: 'https://depixapp.com/docs/en/',
    webhookDocsUrl: 'https://depixapp.com/docs/en/',
    requiredFields: ['token', 'webhookSecret'],
    secretFields: ['token', 'webhookSecret'],
    webhookEvents: ['checkout.completed'],
    feeSummary: 'Taxa publica nao encontrada na documentacao. Confirmar em contrato/conta DePix App.',
    contractNotes: 'Integra checkout Pix DePix via callback_url; cobra em centavos e exige CPF/CNPJ do pagador.',
    notes: 'Checkout Pix via DePix App. Exige API key sk_live/sk_test, CPF/CNPJ do pagador e callback_url para confirmar a venda.',
  },
  {
    id: 'depixpay',
    name: 'DePix Pay',
    kind: 'gateway',
    stability: 'Estavel',
    officialDocsUrl: 'https://depixpay.com/docs',
    webhookDocsUrl: 'https://depixpay.com/docs',
    requiredFields: ['token', 'webhookSecret'],
    secretFields: ['token', 'webhookSecret'],
    webhookEvents: ['payment.completed'],
    feeSummary: 'Taxa publica informada: R$ 0,99 + 1% por transacao.',
    contractNotes: 'Pode ser usado como referencia de custo publicado. Usa API key, CPF/CNPJ, external_id e webhook_url.',
    notes: 'Checkout DePix Pay com taxa publica e webhook de pagamento concluido.',
  },
  {
    id: 'eulen',
    name: 'Eulen Pix2DePix',
    kind: 'gateway',
    stability: 'Contrato',
    officialDocsUrl: 'https://docs.eulen.app/deposit-pix-depix-12532107e0',
    webhookDocsUrl: 'https://docs.eulen.app/deposit-pix-depix-12532107e0',
    requiredFields: ['token', 'depixAddress'],
    secretFields: ['token'],
    webhookEvents: ['deposit.completed'],
    feeSummary: 'Taxa publica nao encontrada. Melhor candidata para negociacao direta de menor taxa por contrato.',
    contractNotes: 'API direta Pix -> DePix. Permite informar depixAddress, split opcional, delay e metadados.',
    notes: 'Opcao para negociar contrato direto Eulen e reduzir custo de movimentacao em volume.',
  },
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    kind: 'gateway',
    stability: 'Estavel',
    officialDocsUrl: 'https://www.mercadopago.com.br/developers/pt/docs',
    webhookDocsUrl: 'https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks',
    requiredFields: ['token'],
    secretFields: ['token', 'webhookSecret'],
    webhookEvents: ['payment'],
    feeSummary: 'Taxas variam por contrato/plano Mercado Pago.',
    contractNotes: 'Confirmar tarifa Pix/API na conta Mercado Pago.',
    notes: 'Boa opcao para Pix dinamico com notificacao de pagamento. Usa access token e webhooks.',
  },
  {
    id: 'efi',
    name: 'Efi / Gerencianet',
    kind: 'gateway',
    stability: 'Estavel',
    officialDocsUrl: 'https://dev.efipay.com.br/docs/api-pix/introducao',
    webhookDocsUrl: 'https://dev.efipay.com.br/docs/api-pix/webhooks',
    requiredFields: ['clientId', 'clientSecret', 'certificate'],
    secretFields: ['clientSecret', 'certificate'],
    webhookEvents: ['pix'],
    feeSummary: 'Taxas variam por contrato/plano Efi.',
    contractNotes: 'Confirmar tarifa Pix API no contrato Efi/Gerencianet.',
    notes: 'API Pix robusta para cobranca imediata. Normalmente exige certificado e OAuth.',
  },
  {
    id: 'asaas',
    name: 'Asaas',
    kind: 'gateway',
    stability: 'Estavel',
    officialDocsUrl: 'https://docs.asaas.com',
    webhookDocsUrl: 'https://docs.asaas.com/docs/webhooks',
    requiredFields: ['token'],
    secretFields: ['token', 'webhookSecret'],
    webhookEvents: ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'],
    feeSummary: 'Taxas variam por plano Asaas.',
    contractNotes: 'Confirmar tarifa Pix/cobranca na conta Asaas.',
    notes: 'Gateway simples para Pix/cobrancas com webhook de pagamento recebido/confirmado.',
  },
  {
    id: 'banco_inter',
    name: 'Banco Inter',
    kind: 'bank',
    stability: 'Estavel',
    officialDocsUrl: 'https://developers.bancointer.com.br',
    webhookDocsUrl: 'https://developers.bancointer.com.br/reference',
    requiredFields: ['clientId', 'clientSecret', 'certificate', 'agency', 'accountNumber'],
    secretFields: ['clientSecret', 'certificate'],
    webhookEvents: ['pix'],
    feeSummary: 'Taxas dependem da conta PJ/contrato Banco Inter.',
    contractNotes: 'Integra banco direto; exige app credenciado, scopes e certificado.',
    notes: 'Integra diretamente com conta PJ Inter. Requer app credenciado, scopes e certificado.',
  },
];

function publicPaymentSettings(settings: any) {
  const catalog = PAYMENT_PROVIDER_CATALOG.find((provider) => provider.id === settings.provider);
  const publicInfo = settings.publicInfo && typeof settings.publicInfo === 'object' ? settings.publicInfo : {};
  return {
    id: settings.id,
    provider: settings.provider,
    name: settings.name ?? catalog?.name ?? settings.provider,
    environment: settings.environment,
    active: settings.active,
    priority: settings.priority,
    pixKey: settings.pixKey ?? '',
    clientId: settings.clientId ?? '',
    webhookUrl: settings.webhookUrl ?? '',
    agency: settings.agency ?? '',
    accountNumber: settings.accountNumber ?? '',
    bankName: settings.bankName ?? '',
    accountLabel: settings.accountLabel ?? '',
    depixAddress: publicInfo.depixAddress ?? '',
    depixSplitAddress: publicInfo.depixSplitAddress ?? '',
    splitFee: publicInfo.splitFee ?? null,
    delayDepixInHours: publicInfo.delayDepixInHours ?? null,
    instructions: settings.instructions ?? '',
    autoApprove: settings.autoApprove,
    hasClientSecret: Boolean(settings.clientSecretRef),
    hasToken: Boolean(settings.tokenRef),
    hasWebhookSecret: Boolean(settings.webhookSecretRef),
    hasCertificate: Boolean(settings.certificateRef),
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
}

function buildPaymentPublicInfo(dto: UpdatePaymentSettingsDto, existing: any) {
  const current = existing?.publicInfo && typeof existing.publicInfo === 'object' ? existing.publicInfo : {};
  return {
    ...current,
    depixAddress: dto.depixAddress?.trim() ?? current.depixAddress ?? '',
    depixSplitAddress: dto.depixSplitAddress?.trim() ?? current.depixSplitAddress ?? '',
    splitFee: dto.splitFee !== undefined && dto.splitFee !== null ? Number(dto.splitFee) : current.splitFee ?? null,
    delayDepixInHours:
      dto.delayDepixInHours !== undefined && dto.delayDepixInHours !== null
        ? Number(dto.delayDepixInHours)
        : current.delayDepixInHours ?? null,
  };
}

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

  async getPaymentSettings(adminId: string) {
    const settings = await this.prisma.paymentSettings.findMany({
      where: { adminId },
      orderBy: [{ active: 'desc' }, { priority: 'asc' }, { updatedAt: 'desc' }],
    });
    return {
      providers: PAYMENT_PROVIDER_CATALOG,
      settings: settings.map(publicPaymentSettings),
    };
  }

  async updatePaymentSettings(adminId: string, dto: UpdatePaymentSettingsDto) {
    const provider = dto.provider?.trim();
    if (!provider) throw new BadRequestException('Selecione um provedor de pagamento.');
    const catalog = PAYMENT_PROVIDER_CATALOG.find((item) => item.id === provider);
    if (!catalog) throw new BadRequestException('Provedor de pagamento nao suportado.');

    const existing = dto.id
      ? await this.prisma.paymentSettings.findFirst({ where: { id: dto.id, adminId } })
      : await this.prisma.paymentSettings.findUnique({ where: { adminId_provider: { adminId, provider } } });

    const willBeActive = dto.active ?? existing?.active ?? false;
    if (willBeActive) {
      const missing = catalog.requiredFields.filter((field) => {
        if (field === 'clientSecret') return !dto.clientSecret && !existing?.clientSecretRef;
        if (field === 'token') return !dto.token && !existing?.tokenRef;
        if (field === 'certificate') return !dto.certificate && !existing?.certificateRef;
        const existingInfo: Record<string, unknown> = existing?.publicInfo && typeof existing.publicInfo === 'object' && !Array.isArray(existing.publicInfo)
          ? existing.publicInfo as Record<string, unknown>
          : {};
        return !text((dto as any)[field]) && !text((existing as any)?.[field]) && !text(existingInfo[field]);
      });
      if (missing.length) {
        throw new BadRequestException(`Preencha antes de ativar: ${missing.join(', ')}.`);
      }
    }

    const encryptedClientSecret = encryptSecret(dto.clientSecret);
    const encryptedToken = encryptSecret(dto.token);
    const encryptedWebhookSecret = encryptSecret(dto.webhookSecret);
    const encryptedCertificate = encryptSecret(dto.certificate);
    const publicInfo = buildPaymentPublicInfo(dto, existing);
    const data: Prisma.PaymentSettingsUncheckedUpdateInput = {
      provider,
      name: dto.name?.trim() || catalog.name,
      environment: dto.environment,
      active: dto.active,
      priority: Number.isFinite(Number(dto.priority)) ? Number(dto.priority) : undefined,
      pixKey: dto.pixKey?.trim(),
      clientId: dto.clientId?.trim(),
      webhookUrl: dto.webhookUrl?.trim(),
      agency: dto.agency?.trim(),
      accountNumber: dto.accountNumber?.trim(),
      bankName: dto.bankName?.trim(),
      accountLabel: dto.accountLabel?.trim(),
      instructions: dto.instructions?.trim(),
      autoApprove: dto.autoApprove,
      publicInfo: publicInfo as Prisma.InputJsonValue,
      ...(encryptedClientSecret ? { clientSecretRef: encryptedClientSecret } : {}),
      ...(encryptedToken ? { tokenRef: encryptedToken } : {}),
      ...(encryptedWebhookSecret ? { webhookSecretRef: encryptedWebhookSecret } : {}),
      ...(encryptedCertificate ? { certificateRef: encryptedCertificate } : {}),
    };

    const settings = existing
      ? await this.prisma.paymentSettings.update({ where: { id: existing.id }, data })
      : await this.prisma.paymentSettings.create({
          data: {
            adminId,
            provider,
            name: dto.name?.trim() || catalog.name,
            environment: dto.environment ?? 'sandbox',
            active: dto.active ?? false,
            priority: Number.isFinite(Number(dto.priority)) ? Number(dto.priority) : 100,
            pixKey: dto.pixKey?.trim(),
            clientId: dto.clientId?.trim(),
            clientSecretRef: encryptedClientSecret,
            tokenRef: encryptedToken,
            webhookUrl: dto.webhookUrl?.trim(),
            webhookSecretRef: encryptedWebhookSecret,
            certificateRef: encryptedCertificate,
            agency: dto.agency?.trim(),
            accountNumber: dto.accountNumber?.trim(),
            bankName: dto.bankName?.trim(),
            accountLabel: dto.accountLabel?.trim(),
            instructions: dto.instructions?.trim(),
            autoApprove: dto.autoApprove ?? false,
            publicInfo: publicInfo as Prisma.InputJsonValue,
          },
        });

    return publicPaymentSettings(settings);
  }

  async togglePaymentSettings(adminId: string, id: string, active: boolean) {
    const settings = await this.prisma.paymentSettings.findFirst({ where: { id, adminId } });
    if (!settings) throw new BadRequestException('Configuracao de pagamento nao encontrada.');
    const updated = await this.prisma.paymentSettings.update({
      where: { id },
      data: { active },
    });
    return publicPaymentSettings(updated);
  }
}
