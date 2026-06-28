import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, SupportServerStatus, SupportTopicStatus, UserRole, UserStatus } from '@prisma/client';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertSupportLinkDto, UpsertSupportServerUpdateDto, UpsertSupportTopicDto } from './dto';

function isStaff(user: RequestUser) {
  return user.role === 'admin' || user.role === 'dev';
}

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function parseSteps(value?: string) {
  const text = clean(value);
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map((item) => clean(item)).filter(Boolean);
  } catch {
    // fallback below
  }
  return text.split(/\r?\n/).map((item) => clean(item.replace(/^[-*\d.)\s]+/, ''))).filter(Boolean);
}

const defaultTopics = [
  {
    id: 'default-prepaid-order',
    title: 'Como abrir um pedido pre-pago',
    category: 'Primeiros passos',
    summary: 'Fluxo basico para cobrar, anexar comprovante e acompanhar a recarga.',
    serverId: null,
    server: null,
    steps: [
      'Confirme servidor, login e quantidade antes de cobrar.',
      'Use a chave PIX correta e aguarde o comprovante legivel.',
      'Abra o pedido com os dados completos.',
      'Acompanhe ate recarregado ou rejeitado.',
    ],
    pinned: true,
    status: 'published',
  },
  {
    id: 'default-recharge-code',
    title: 'Como vender codigo de recarga',
    category: 'Vendas',
    summary: 'Entrega segura de codigo com baixa automatica de estoque.',
    serverId: null,
    server: null,
    steps: [
      'Confirme pagamento antes do checkout.',
      'Escolha o produto com estoque disponivel.',
      'Finalize a venda e copie todos os codigos entregues.',
      'Nunca reutilize codigo vendido.',
    ],
    pinned: true,
    status: 'published',
  },
  {
    id: 'default-technical-support',
    title: 'Checklist tecnico para atendimento',
    category: 'Tecnico',
    summary: 'Perguntas minimas antes de escalar para admin.',
    serverId: null,
    server: null,
    steps: [
      'Pergunte player, servidor, login e erro exibido.',
      'Confirme internet e versao do aplicativo.',
      'Teste outro player quando o erro parecer local.',
      'Encaminhe para admin se houver instabilidade no servidor.',
    ],
    pinned: false,
    status: 'published',
  },
];

const defaultLinks = [
  { id: 'default-wa', serverId: null, server: null, label: 'Suporte WhatsApp', href: 'https://wa.me/', category: 'Atendimento', detail: 'Canal direto para urgencias operacionais.', pinned: true, status: 'published' },
  { id: 'default-whatsapp-status', serverId: null, server: null, label: 'Status do WhatsApp', href: '/whatsapp', category: 'Tecnico', detail: 'Verifique conexao, QR Code, fila e logs.', pinned: false, status: 'published' },
  { id: 'default-orders', serverId: null, server: null, label: 'Pedidos de credito', href: '/creditrequests', category: 'Vendas', detail: 'Acompanhe aprovacoes, recusas e historico.', pinned: false, status: 'published' },
  { id: 'default-codes', serverId: null, server: null, label: 'Codigos de recarga', href: '/recharge-codes', category: 'Vendas', detail: 'Venda codigos de estoque proprio com checkout local.', pinned: false, status: 'published' },
];

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async overview(user: RequestUser) {
    const staff = isStaff(user);
    const visibleServerIds = staff ? [] : await this.visibleServerIds(user.sub);
    const wherePublished = { status: SupportTopicStatus.published };
    const scopedPublished = {
      ...wherePublished,
      OR: [{ serverId: null }, { serverId: { in: visibleServerIds } }],
    };
    const scopedUpdates = {
      published: true,
      OR: [{ serverId: null }, { serverId: { in: visibleServerIds } }],
    };
    const [topics, links, updates, servers] = await Promise.all([
      this.prisma.supportTopic.findMany({
        where: staff ? {} : scopedPublished,
        orderBy: [{ pinned: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
        include: {
          server: { select: { id: true, name: true, active: true } },
          author: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.supportLink.findMany({
        where: staff ? {} : scopedPublished,
        orderBy: [{ pinned: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
        include: {
          server: { select: { id: true, name: true, active: true } },
          author: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.supportServerUpdate.findMany({
        where: staff ? {} : scopedUpdates,
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        take: staff ? 100 : 30,
        include: {
          server: { select: { id: true, name: true, active: true } },
          author: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.server.findMany({
        where: staff
          ? { deletedAt: null }
          : { active: true, deletedAt: null, resellerServers: { some: { resellerId: user.sub, active: true } } },
        select: { id: true, name: true, active: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    const resolvedTopics = topics.length ? topics : defaultTopics;
    const resolvedLinks = links.length ? links : defaultLinks;

    return {
      topics: resolvedTopics,
      links: resolvedLinks,
      updates,
      servers,
      serverGroups: this.buildServerGroups(servers, resolvedTopics, resolvedLinks, updates),
      categories: [...new Set([...resolvedTopics.map((item) => item.category), ...resolvedLinks.map((item) => item.category)])],
      canManage: staff,
    };
  }

  async createTopic(user: RequestUser, dto: UpsertSupportTopicDto) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas administradores publicam topicos.');
    const title = clean(dto.title);
    const category = clean(dto.category);
    if (!title || !category) throw new BadRequestException('Titulo e categoria sao obrigatorios.');
    const status = dto.status ?? 'published';
    const topic = await this.prisma.supportTopic.create({
      data: {
        serverId: clean(dto.serverId) || null,
        title,
        category,
        summary: clean(dto.summary) || null,
        content: clean(dto.content) || null,
        steps: parseSteps(dto.steps),
        status,
        pinned: dto.pinned ?? false,
        sortOrder: dto.sortOrder ?? 0,
        authorId: user.sub,
        publishedAt: status === 'published' ? new Date() : null,
      },
      include: { server: { select: { id: true, name: true, active: true } } },
    });
    if (status === 'published') {
      await this.notifyResellers({
        serverId: topic.serverId,
        title: 'Novo tutorial de suporte',
        message: `${topic.server?.name ?? 'Geral'}: ${topic.title}`,
        relatedEntityId: topic.id,
      });
    }
    return topic;
  }

  async updateTopic(user: RequestUser, id: string, dto: UpsertSupportTopicDto) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas administradores editam topicos.');
    const current = await this.prisma.supportTopic.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Topico nao encontrado.');
    const status = dto.status ?? current.status;
    const topic = await this.prisma.supportTopic.update({
      where: { id },
      data: {
        serverId: clean(dto.serverId) || null,
        title: clean(dto.title) || current.title,
        category: clean(dto.category) || current.category,
        summary: clean(dto.summary) || null,
        content: clean(dto.content) || null,
        steps: parseSteps(dto.steps),
        status,
        pinned: dto.pinned ?? current.pinned,
        sortOrder: dto.sortOrder ?? current.sortOrder,
        publishedAt: status === 'published' ? current.publishedAt ?? new Date() : null,
      },
      include: { server: { select: { id: true, name: true, active: true } } },
    });
    if (current.status !== SupportTopicStatus.published && status === SupportTopicStatus.published) {
      await this.notifyResellers({
        serverId: topic.serverId,
        title: 'Novo tutorial de suporte',
        message: `${topic.server?.name ?? 'Geral'}: ${topic.title}`,
        relatedEntityId: topic.id,
      });
    }
    return topic;
  }

  async createLink(user: RequestUser, dto: UpsertSupportLinkDto) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas administradores publicam links.');
    const label = clean(dto.label);
    const href = clean(dto.href);
    const category = clean(dto.category);
    if (!label || !href || !category) throw new BadRequestException('Nome, URL e categoria sao obrigatorios.');
    const status = dto.status ?? 'published';
    const link = await this.prisma.supportLink.create({
      data: {
        serverId: clean(dto.serverId) || null,
        label,
        href,
        category,
        detail: clean(dto.detail) || null,
        status,
        pinned: dto.pinned ?? false,
        sortOrder: dto.sortOrder ?? 0,
        authorId: user.sub,
        publishedAt: status === 'published' ? new Date() : null,
      },
      include: { server: { select: { id: true, name: true, active: true } } },
    });
    if (status === 'published') {
      await this.notifyResellers({
        serverId: link.serverId,
        title: 'Novo link de suporte',
        message: `${link.server?.name ?? 'Geral'}: ${link.label}`,
        relatedEntityId: link.id,
      });
    }
    return link;
  }

  async updateLink(user: RequestUser, id: string, dto: UpsertSupportLinkDto) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas administradores editam links.');
    const current = await this.prisma.supportLink.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Link nao encontrado.');
    const status = dto.status ?? current.status;
    const link = await this.prisma.supportLink.update({
      where: { id },
      data: {
        serverId: clean(dto.serverId) || null,
        label: clean(dto.label) || current.label,
        href: clean(dto.href) || current.href,
        category: clean(dto.category) || current.category,
        detail: clean(dto.detail) || null,
        status,
        pinned: dto.pinned ?? current.pinned,
        sortOrder: dto.sortOrder ?? current.sortOrder,
        publishedAt: status === 'published' ? current.publishedAt ?? new Date() : null,
      },
      include: { server: { select: { id: true, name: true, active: true } } },
    });
    if (current.status !== SupportTopicStatus.published && status === SupportTopicStatus.published) {
      await this.notifyResellers({
        serverId: link.serverId,
        title: 'Novo link de suporte',
        message: `${link.server?.name ?? 'Geral'}: ${link.label}`,
        relatedEntityId: link.id,
      });
    }
    return link;
  }

  async createUpdate(user: RequestUser, dto: UpsertSupportServerUpdateDto) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas administradores publicam atualizacoes.');
    const title = clean(dto.title);
    const message = clean(dto.message);
    if (!title || !message) throw new BadRequestException('Titulo e mensagem sao obrigatorios.');
    const update = await this.prisma.supportServerUpdate.create({
      data: {
        serverId: clean(dto.serverId) || null,
        title,
        message,
        status: (dto.status ?? 'operational') as SupportServerStatus,
        impact: clean(dto.impact) || null,
        actionText: clean(dto.actionText) || null,
        pinned: dto.pinned ?? false,
        published: dto.published ?? true,
        authorId: user.sub,
        publishedAt: dto.published === false ? null : new Date(),
      },
      include: { server: { select: { id: true, name: true, active: true } } },
    });
    if (update.published) {
      await this.notifyResellers({
        serverId: update.serverId,
        title: 'Atualizacao de servidor',
        message: `${update.server?.name ?? 'Geral'}: ${update.title}`,
        relatedEntityId: update.id,
        highPriority: update.status !== SupportServerStatus.operational,
      });
    }
    return update;
  }

  async updateServerUpdate(user: RequestUser, id: string, dto: UpsertSupportServerUpdateDto) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas administradores editam atualizacoes.');
    const current = await this.prisma.supportServerUpdate.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Atualizacao nao encontrada.');
    const published = dto.published ?? current.published;
    const update = await this.prisma.supportServerUpdate.update({
      where: { id },
      data: {
        serverId: clean(dto.serverId) || null,
        title: clean(dto.title) || current.title,
        message: clean(dto.message) || current.message,
        status: (dto.status ?? current.status) as SupportServerStatus,
        impact: clean(dto.impact) || null,
        actionText: clean(dto.actionText) || null,
        pinned: dto.pinned ?? current.pinned,
        published,
        publishedAt: published ? current.publishedAt ?? new Date() : null,
      },
      include: { server: { select: { id: true, name: true, active: true } } },
    });
    if (!current.published && published) {
      await this.notifyResellers({
        serverId: update.serverId,
        title: 'Atualizacao de servidor',
        message: `${update.server?.name ?? 'Geral'}: ${update.title}`,
        relatedEntityId: update.id,
        highPriority: update.status !== SupportServerStatus.operational,
      });
    }
    return update;
  }

  private async visibleServerIds(userId: string) {
    const rows = await this.prisma.resellerServer.findMany({
      where: { resellerId: userId, active: true, server: { active: true, deletedAt: null } },
      select: { serverId: true },
    });
    return [...new Set(rows.map((row) => row.serverId))];
  }

  private buildServerGroups(
    servers: Array<{ id: string; name: string; active: boolean }>,
    topics: Array<any>,
    links: Array<any>,
    updates: Array<any>,
  ) {
    const groups = [
      {
        id: 'general',
        name: 'Geral',
        active: true,
        topics: topics.filter((item) => !item.serverId),
        links: links.filter((item) => !item.serverId),
        updates: updates.filter((item) => !item.serverId),
      },
      ...servers.map((server) => ({
        id: server.id,
        name: server.name,
        active: server.active,
        topics: topics.filter((item) => item.serverId === server.id),
        links: links.filter((item) => item.serverId === server.id),
        updates: updates.filter((item) => item.serverId === server.id),
      })),
    ];

    return groups.map((group) => ({
      ...group,
      counts: {
        topics: group.topics.length,
        links: group.links.length,
        updates: group.updates.length,
      },
      latestAt: [group.topics, group.links, group.updates]
        .flat()
        .map((item) => item.updatedAt ?? item.createdAt ?? item.publishedAt)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null,
    }));
  }

  private async notifyResellers(input: {
    serverId?: string | null;
    title: string;
    message: string;
    relatedEntityId: string;
    highPriority?: boolean;
  }) {
    const recipients = await this.prisma.user.findMany({
      where: {
        role: UserRole.reseller,
        status: UserStatus.active,
        ...(input.serverId ? { resellerServers: { some: { serverId: input.serverId, active: true } } } : {}),
      },
      select: { id: true },
    });

    await Promise.allSettled(
      recipients.map((recipient) =>
        this.notifications.create({
          userId: recipient.id,
          type: NotificationType.system,
          title: input.title,
          message: input.message,
          relatedEntityId: input.relatedEntityId,
          highPriority: input.highPriority ?? false,
          url: '/support',
        }),
      ),
    );
  }
}
