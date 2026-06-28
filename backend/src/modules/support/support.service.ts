import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SupportServerStatus, SupportTopicStatus } from '@prisma/client';
import { RequestUser } from '../../common/decorators/current-user.decorator';
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
  { id: 'default-wa', label: 'Suporte WhatsApp', href: 'https://wa.me/', category: 'Atendimento', detail: 'Canal direto para urgencias operacionais.', pinned: true, status: 'published' },
  { id: 'default-whatsapp-status', label: 'Status do WhatsApp', href: '/whatsapp', category: 'Tecnico', detail: 'Verifique conexao, QR Code, fila e logs.', pinned: false, status: 'published' },
  { id: 'default-orders', label: 'Pedidos de credito', href: '/creditrequests', category: 'Vendas', detail: 'Acompanhe aprovacoes, recusas e historico.', pinned: false, status: 'published' },
  { id: 'default-codes', label: 'Codigos de recarga', href: '/recharge-codes', category: 'Vendas', detail: 'Venda codigos de estoque proprio com checkout local.', pinned: false, status: 'published' },
];

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: RequestUser) {
    const wherePublished = { status: SupportTopicStatus.published };
    const [topics, links, updates, servers] = await Promise.all([
      this.prisma.supportTopic.findMany({
        where: isStaff(user) ? {} : wherePublished,
        orderBy: [{ pinned: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
        include: { author: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.supportLink.findMany({
        where: isStaff(user) ? {} : wherePublished,
        orderBy: [{ pinned: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
        include: { author: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.supportServerUpdate.findMany({
        where: isStaff(user) ? {} : { published: true },
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        take: isStaff(user) ? 100 : 30,
        include: {
          server: { select: { id: true, name: true, active: true } },
          author: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.server.findMany({
        where: isStaff(user) ? { deletedAt: null } : { active: true, deletedAt: null },
        select: { id: true, name: true, active: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      topics: topics.length ? topics : defaultTopics,
      links: links.length ? links : defaultLinks,
      updates,
      servers,
      categories: [...new Set([...(topics.length ? topics : defaultTopics).map((item) => item.category), ...(links.length ? links : defaultLinks).map((item) => item.category)])],
      canManage: isStaff(user),
    };
  }

  async createTopic(user: RequestUser, dto: UpsertSupportTopicDto) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas administradores publicam topicos.');
    const title = clean(dto.title);
    const category = clean(dto.category);
    if (!title || !category) throw new BadRequestException('Titulo e categoria sao obrigatorios.');
    const status = dto.status ?? 'published';
    return this.prisma.supportTopic.create({
      data: {
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
    });
  }

  async updateTopic(user: RequestUser, id: string, dto: UpsertSupportTopicDto) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas administradores editam topicos.');
    const current = await this.prisma.supportTopic.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Topico nao encontrado.');
    const status = dto.status ?? current.status;
    return this.prisma.supportTopic.update({
      where: { id },
      data: {
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
    });
  }

  async createLink(user: RequestUser, dto: UpsertSupportLinkDto) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas administradores publicam links.');
    const status = dto.status ?? 'published';
    return this.prisma.supportLink.create({
      data: {
        label: clean(dto.label),
        href: clean(dto.href),
        category: clean(dto.category),
        detail: clean(dto.detail) || null,
        status,
        pinned: dto.pinned ?? false,
        sortOrder: dto.sortOrder ?? 0,
        authorId: user.sub,
        publishedAt: status === 'published' ? new Date() : null,
      },
    });
  }

  async updateLink(user: RequestUser, id: string, dto: UpsertSupportLinkDto) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas administradores editam links.');
    const current = await this.prisma.supportLink.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Link nao encontrado.');
    const status = dto.status ?? current.status;
    return this.prisma.supportLink.update({
      where: { id },
      data: {
        label: clean(dto.label) || current.label,
        href: clean(dto.href) || current.href,
        category: clean(dto.category) || current.category,
        detail: clean(dto.detail) || null,
        status,
        pinned: dto.pinned ?? current.pinned,
        sortOrder: dto.sortOrder ?? current.sortOrder,
        publishedAt: status === 'published' ? current.publishedAt ?? new Date() : null,
      },
    });
  }

  async createUpdate(user: RequestUser, dto: UpsertSupportServerUpdateDto) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas administradores publicam atualizacoes.');
    const title = clean(dto.title);
    const message = clean(dto.message);
    if (!title || !message) throw new BadRequestException('Titulo e mensagem sao obrigatorios.');
    return this.prisma.supportServerUpdate.create({
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
  }

  async updateServerUpdate(user: RequestUser, id: string, dto: UpsertSupportServerUpdateDto) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas administradores editam atualizacoes.');
    const current = await this.prisma.supportServerUpdate.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Atualizacao nao encontrada.');
    const published = dto.published ?? current.published;
    return this.prisma.supportServerUpdate.update({
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
  }
}
