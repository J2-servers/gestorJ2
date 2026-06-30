import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RechargeCodeOrderStatus, RechargeCodePaymentStatus, RechargeCodeStatus } from '@prisma/client';
import { createDecipheriv, createHash, createHmac, timingSafeEqual } from 'crypto';
import * as XLSX from 'xlsx';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApproveRechargeCodePaymentDto,
  CreateRechargeCodeOrderDto,
  ImportRechargeCodesDto,
  SellRechargeCodeDto,
  UpsertPlanModalityDto,
  UpsertRechargeCodeProductDto,
  VoidRechargeCodeDto,
} from './dto';

type ImportRow = Record<string, unknown>;
type ParsedImportRow = {
  code: string;
  pin: string;
  serial: string;
  expiresAt: Date | null;
  serverName: string;
  modalityName: string;
  rowNumber: number;
};

const MAX_IMPORT_ROWS = 50000;
const CREATE_CHUNK_SIZE = 1000;
const RESERVATION_MINUTES = 15;
const DEPIX_API_BASE_URL = 'https://depix-backend.vercel.app';
const DEPIXPAY_API_BASE_URL = 'https://api.depixpay.com';
const EULEN_API_BASE_URL = 'https://depix.eulen.app';
const CHECKOUT_PROVIDER_DETAILS: Record<string, { name: string; feeSummary: string; contractNotes: string; paymentMode: string }> = {
  manual_pix: {
    name: 'PIX manual',
    feeSummary: 'Sem taxa de gateway; depende da conta bancaria usada.',
    contractNotes: 'O admin confere o pagamento e libera os codigos manualmente.',
    paymentMode: 'manual',
  },
  depix: {
    name: 'DePix App',
    feeSummary: 'Taxas dependem do contrato DePix/Liquid.',
    contractNotes: 'Gera checkout PIX para recebimento e conversao para DePix quando a conta estiver contratada.',
    paymentMode: 'checkout',
  },
  depixpay: {
    name: 'DePix Pay',
    feeSummary: 'Referencia publica encontrada: R$ 0,99 + 1% por transacao, sujeita a contrato vigente.',
    contractNotes: 'Use credenciais oficiais e webhook para aprovacao automatica.',
    paymentMode: 'checkout',
  },
  eulen: {
    name: 'Eulen Pix2DePix',
    feeSummary: 'Modelo de taxa e split depende da negociacao Eulen.',
    contractNotes: 'Requer token, endereco DePix e configuracao de webhook para baixa automatica.',
    paymentMode: 'checkout',
  },
  mercadopago: {
    name: 'Mercado Pago',
    feeSummary: 'Taxas variam por produto e plano Mercado Pago.',
    contractNotes: 'Integre credenciais e webhooks antes de ativar automacao.',
    paymentMode: 'checkout',
  },
  efi: {
    name: 'Efí/Gerencianet',
    feeSummary: 'Taxas variam pelo contrato Efí.',
    contractNotes: 'Requer client id, client secret e certificado para PIX API.',
    paymentMode: 'checkout',
  },
  asaas: {
    name: 'Asaas',
    feeSummary: 'Taxas variam por plano Asaas.',
    contractNotes: 'Requer API key e webhook para confirmacao automatica.',
    paymentMode: 'checkout',
  },
  banco_inter: {
    name: 'Banco Inter',
    feeSummary: 'Taxas variam pela conta PJ/API contratada.',
    contractNotes: 'Requer credenciais OAuth, certificado e webhook PIX.',
    paymentMode: 'checkout',
  },
};
const XLSX_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream',
]);

function isStaff(user: RequestUser) {
  return user.role === 'admin' || user.role === 'dev';
}

function text(value: unknown) {
  return String(value ?? '').trim();
}

function digits(value: unknown) {
  return text(value).replace(/\D/g, '');
}

function decryptSecret(value: string | null | undefined) {
  const secret = text(value);
  if (!secret) return '';
  if (!secret.startsWith('enc:v1:')) return secret;
  const [, , ivPart, tagPart, encryptedPart] = secret.split(':');
  const keySource = process.env.PAYMENT_SETTINGS_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!keySource) throw new BadRequestException('Defina PAYMENT_SETTINGS_ENCRYPTION_KEY para usar credenciais sensiveis.');
  const decipher = createDecipheriv('aes-256-gcm', createHash('sha256').update(keySource).digest(), Buffer.from(ivPart, 'base64'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedPart, 'base64')), decipher.final()]).toString('utf8');
}

function normalizeHeader(value: unknown) {
  return text(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function pick(row: ImportRow, names: string[]) {
  return Object.entries(row).find(([key]) => names.includes(normalizeHeader(key)))?.[1];
}

function valueByColumn(row: ImportRow, column: string | undefined, fallbackNames: string[]) {
  const wanted = normalizeHeader(column);
  if (wanted) {
    const found = Object.entries(row).find(([key]) => normalizeHeader(key) === wanted);
    if (found) return found[1];
  }
  return pick(row, fallbackNames);
}

function parseDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function validateXlsxFile(file: Express.Multer.File | undefined) {
  if (!file) throw new BadRequestException('Envie um arquivo XLSX.');
  if (!file.originalname.toLowerCase().endsWith('.xlsx')) throw new BadRequestException('Formato invalido. Use .xlsx.');
  if (!XLSX_MIME_TYPES.has(file.mimetype)) throw new BadRequestException('Tipo de arquivo nao permitido.');
}

function readImportSheet(file: Express.Multer.File, sheetName?: string) {
  const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true, dense: false });
  const selectedSheetName = text(sheetName) || workbook.SheetNames[0];
  if (!selectedSheetName) throw new BadRequestException('Planilha sem abas.');
  const sheet = workbook.Sheets[selectedSheetName];
  if (!sheet) throw new BadRequestException('Aba selecionada nao encontrada no XLSX.');
  const rows = XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: '', raw: false });
  if (!rows.length) throw new BadRequestException('Planilha sem linhas para importar.');
  if (rows.length > MAX_IMPORT_ROWS) throw new BadRequestException(`Importe no maximo ${MAX_IMPORT_ROWS} codigos por arquivo.`);
  const headers = Object.keys(rows[0] ?? {}).map((item) => text(item)).filter(Boolean);
  return { workbook, sheetName: selectedSheetName, headers, rows };
}

function suggestColumn(headers: string[], aliases: string[]) {
  return headers.find((header) => aliases.includes(normalizeHeader(header))) || '';
}

function buildMapping(headers: string[], dto: ImportRechargeCodesDto) {
  return {
    sheetName: text(dto.sheetName),
    codeColumn: text(dto.codeColumn) || suggestColumn(headers, ['code', 'codigo', 'voucher', 'cartao']),
    pinColumn: text(dto.pinColumn) || suggestColumn(headers, ['pin', 'senha', 'password']),
    serialColumn: text(dto.serialColumn) || suggestColumn(headers, ['serial', 'serie']),
    expiresAtColumn: text(dto.expiresAtColumn) || suggestColumn(headers, ['expires_at', 'validade', 'expira', 'vencimento']),
    serverColumn: text(dto.serverColumn) || suggestColumn(headers, ['servidor', 'server']),
    modalityColumn: text(dto.modalityColumn) || suggestColumn(headers, ['modalidade', 'plano', 'plan', 'duracao']),
    costColumn: text(dto.costColumn) || suggestColumn(headers, ['custo', 'cost']),
    batchColumn: text(dto.batchColumn) || suggestColumn(headers, ['lote', 'batch']),
    supplierColumn: text(dto.supplierColumn) || suggestColumn(headers, ['fornecedor', 'supplier']),
    noteColumn: text(dto.noteColumn) || suggestColumn(headers, ['observacao', 'obs', 'note']),
  };
}

function parseImportRows(rows: ImportRow[], dto: ImportRechargeCodesDto) {
  return rows.map<ParsedImportRow>((row, index) => ({
    code: text(valueByColumn(row, dto.codeColumn, ['code', 'codigo', 'voucher', 'cartao'])),
    pin: text(valueByColumn(row, dto.pinColumn, ['pin', 'senha', 'password'])),
    serial: text(valueByColumn(row, dto.serialColumn, ['serial', 'serie'])),
    expiresAt: parseDate(valueByColumn(row, dto.expiresAtColumn, ['expires_at', 'validade', 'expira', 'vencimento'])),
    serverName: text(valueByColumn(row, dto.serverColumn, ['servidor', 'server'])),
    modalityName: text(valueByColumn(row, dto.modalityColumn, ['modalidade', 'plano', 'plan', 'duracao'])),
    rowNumber: index + 2,
  }));
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

@Injectable()
export class RechargeCodesService {
  constructor(private readonly prisma: PrismaService) {}

  async listModalities(user: RequestUser) {
    return this.prisma.planModality.findMany({
      where: isStaff(user) ? {} : { active: true },
      include: { server: { select: { id: true, name: true } } },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
  }

  async createModality(user: RequestUser, dto: UpsertPlanModalityDto) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas administradores gerenciam modalidades.');
    const name = text(dto.name);
    if (!name) throw new BadRequestException('Nome da modalidade obrigatorio.');
    return this.prisma.planModality.create({
      data: {
        serverId: text(dto.serverId) || null,
        name,
        durationDays: dto.durationDays ?? null,
        active: dto.active ?? true,
      },
    });
  }

  async updateModality(user: RequestUser, id: string, dto: UpsertPlanModalityDto) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas administradores gerenciam modalidades.');
    const name = text(dto.name);
    if (!name) throw new BadRequestException('Nome da modalidade obrigatorio.');
    return this.prisma.planModality.update({
      where: { id },
      data: {
        serverId: text(dto.serverId) || null,
        name,
        durationDays: dto.durationDays ?? null,
        active: dto.active ?? true,
      },
    });
  }

  async listProducts(user: RequestUser) {
    await this.releaseExpiredReservations();
    const products = await this.prisma.rechargeCodeProduct.findMany({
      where: isStaff(user) ? {} : { active: true },
      include: {
        server: { select: { id: true, name: true } },
        modality: { select: { id: true, name: true, durationDays: true } },
        _count: { select: { codes: true } },
      },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });

    const stock = await this.prisma.rechargeCode.groupBy({
      by: ['productId', 'status'],
      _count: { _all: true },
      where: { productId: { in: products.map((item) => item.id) } },
    });

    return products.map((product) => {
      const available = stock.find((item) => item.productId === product.id && item.status === RechargeCodeStatus.available)?._count._all ?? 0;
      const base = {
        ...product,
        availableForSale: available > 0,
      };
      if (!isStaff(user)) {
        const { _count, ...safe } = base;
        return safe;
      }
      return {
        ...base,
        stock: {
          total: product._count.codes,
          available,
          reserved: stock.find((item) => item.productId === product.id && item.status === RechargeCodeStatus.reserved)?._count._all ?? 0,
          sold: stock.find((item) => item.productId === product.id && item.status === RechargeCodeStatus.sold)?._count._all ?? 0,
          voided: stock.find((item) => item.productId === product.id && item.status === RechargeCodeStatus.voided)?._count._all ?? 0,
        },
      };
    });
  }

  async catalog(user: RequestUser) {
    if (isStaff(user)) return this.listProducts(user);
    const products = await this.listProducts(user);
    return products.map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      server: product.server,
      modality: product.modality,
      denomination: product.denomination,
      saleValue: product.saleValue,
      sale_value: product.saleValue,
      instructions: product.instructions,
      availableForSale: product.availableForSale,
    }));
  }

  async createProduct(user: RequestUser, dto: UpsertRechargeCodeProductDto) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas administradores gerenciam produtos de codigo.');
    const name = text(dto.name);
    if (!name) throw new BadRequestException('Nome do produto obrigatorio.');
    return this.prisma.rechargeCodeProduct.create({
      data: {
        name,
        description: text(dto.description) || null,
        serverId: text(dto.serverId) || null,
        modalityId: text(dto.modalityId) || null,
        denomination: dto.denomination,
        costValue: dto.costValue ?? 0,
        saleValue: dto.saleValue,
        instructions: text(dto.instructions) || null,
        active: dto.active ?? true,
      },
    });
  }

  async updateProduct(user: RequestUser, id: string, dto: UpsertRechargeCodeProductDto) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas administradores gerenciam produtos de codigo.');
    const current = await this.prisma.rechargeCodeProduct.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Produto de codigo nao encontrado.');
    const name = text(dto.name);
    if (!name) throw new BadRequestException('Nome do produto obrigatorio.');
    return this.prisma.rechargeCodeProduct.update({
      where: { id },
      data: {
        name,
        description: text(dto.description) || null,
        serverId: text(dto.serverId) || null,
        modalityId: text(dto.modalityId) || null,
        denomination: dto.denomination,
        costValue: dto.costValue ?? 0,
        saleValue: dto.saleValue,
        instructions: text(dto.instructions) || null,
        active: dto.active ?? true,
      },
    });
  }

  async listBatches(user: RequestUser, productId: string) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas equipe interna consulta lotes.');
    return this.prisma.rechargeCodeBatch.findMany({ where: { productId }, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  async listCodes(user: RequestUser, productId: string, status?: RechargeCodeStatus) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas equipe interna consulta codigos.');
    return this.prisma.rechargeCode.findMany({
      where: { productId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: { soldTo: { select: { id: true, name: true, email: true } }, orderItem: { select: { orderId: true } } },
    });
  }

  async listSales(user: RequestUser, productId?: string) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas equipe interna consulta vendas de codigos.');
    return this.prisma.rechargeCode.findMany({
      where: { status: RechargeCodeStatus.sold, ...(productId ? { productId } : {}) },
      orderBy: { soldAt: 'desc' },
      take: 300,
      include: {
        product: { select: { id: true, name: true, saleValue: true, denomination: true, server: { select: { name: true } }, modality: { select: { name: true } } } },
        soldTo: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async voidCode(user: RequestUser, codeId: string, dto: VoidRechargeCodeDto) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas equipe interna gerencia codigos.');
    const code = await this.prisma.rechargeCode.findUnique({ where: { id: codeId } });
    if (!code) throw new NotFoundException('Codigo nao encontrado.');
    if (code.status === RechargeCodeStatus.sold) throw new BadRequestException('Codigo vendido nao pode ser inutilizado por aqui.');
    if (code.status === RechargeCodeStatus.voided) return code;
    return this.prisma.rechargeCode.update({
      where: { id: codeId },
      data: { status: RechargeCodeStatus.voided, voidReason: text(dto.reason) || 'Inutilizado manualmente' },
      include: { product: true },
    });
  }

  async previewXlsx(user: RequestUser, productId: string, file: Express.Multer.File | undefined, dto: ImportRechargeCodesDto) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas administradores importam estoque.');
    const product = await this.productOrThrow(productId);
    validateXlsxFile(file);
    const { workbook, sheetName, headers, rows } = readImportSheet(file!, dto.sheetName);
    const mapping = buildMapping(headers, dto);
    const parsed = parseImportRows(rows, { ...dto, ...mapping });
    const resolved = await this.resolveImportTargets(product.id, parsed);
    const valid = resolved.filter((row) => row.code.length >= 4 && row.productId);
    const uniqueCodes = [...new Set(valid.map((row) => row.code))];
    const existing = uniqueCodes.length ? await this.prisma.rechargeCode.findMany({ where: { code: { in: uniqueCodes } }, select: { code: true } }) : [];
    const existingCodes = new Set(existing.map((row) => row.code));
    const duplicateInFileCount = valid.filter((row, index, all) => all.findIndex((item) => item.code === row.code) !== index).length;
    const importableCount = valid.filter((row, index, all) => !existingCodes.has(row.code) && all.findIndex((item) => item.code === row.code) === index).length;

    return {
      fileName: file!.originalname,
      fileSize: file!.size,
      sheetNames: workbook.SheetNames,
      selectedSheetName: sheetName,
      headers,
      mapping,
      totalRows: rows.length,
      validCount: valid.length,
      invalidCount: resolved.filter((row) => row.code.length < 4 || !row.productId).length,
      duplicateInFileCount,
      duplicateInSystemCount: existingCodes.size,
      importableCount,
      sampleRows: resolved.slice(0, 15).map((row) => ({
        rowNumber: row.rowNumber,
        code: row.code,
        pin: row.pin,
        serial: row.serial,
        expiresAt: row.expiresAt,
        server: row.serverName,
        modality: row.modalityName,
        targetProduct: row.productName,
        valid: row.code.length >= 4 && Boolean(row.productId),
        duplicateInSystem: existingCodes.has(row.code),
      })),
      invalidSamples: resolved.filter((row) => row.code.length < 4 || !row.productId).slice(0, 25).map((row) => ({
        rowNumber: row.rowNumber,
        reason: row.code.length < 4 ? 'Codigo ausente ou menor que 4 caracteres.' : 'Servidor/modalidade da linha nao possuem produto cadastrado.',
      })),
      limits: { maxRows: MAX_IMPORT_ROWS, maxFileSizeMb: 20 },
    };
  }

  async importXlsx(user: RequestUser, productId: string, file: Express.Multer.File | undefined, dto: ImportRechargeCodesDto) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas administradores importam estoque.');
    const product = await this.productOrThrow(productId);
    validateXlsxFile(file);
    const { sheetName, headers, rows } = readImportSheet(file!, dto.sheetName);
    const mapping = buildMapping(headers, dto);
    if (!mapping.codeColumn) throw new BadRequestException('Selecione a coluna que contem o codigo.');
    const parsed = parseImportRows(rows, { ...dto, ...mapping });
    const resolved = await this.resolveImportTargets(product.id, parsed);
    const valid = resolved.filter((row) => row.code.length >= 4 && row.productId);
    const invalidCount = resolved.length - valid.length;
    const uniqueCodes = [...new Set(valid.map((row) => row.code))];
    const existing = uniqueCodes.length ? await this.prisma.rechargeCode.findMany({ where: { code: { in: uniqueCodes } }, select: { code: true } }) : [];
    const existingCodes = new Set(existing.map((row) => row.code));
    const toCreate = valid.filter((row, index, all) => !existingCodes.has(row.code) && all.findIndex((item) => item.code === row.code) === index);
    const duplicateCount = valid.length - toCreate.length;

    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.rechargeCodeBatch.create({
        data: {
          productId: product.id,
          importedById: user.sub,
          sourceFilename: file!.originalname,
          notes: [text(dto.notes), `Aba: ${sheetName}`, `Colunas: codigo=${mapping.codeColumn}; servidor=${mapping.serverColumn || '-'}; modalidade=${mapping.modalityColumn || '-'}`]
            .filter(Boolean)
            .join(' | '),
          totalRows: rows.length,
          importedCount: toCreate.length,
          duplicateCount,
          invalidCount,
        },
      });
      for (const group of chunk(toCreate, CREATE_CHUNK_SIZE)) {
        await tx.rechargeCode.createMany({
          data: group.map((row) => ({
            productId: row.productId!,
            batchId: batch.id,
            code: row.code,
            pin: row.pin || null,
            serial: row.serial || null,
            expiresAt: row.expiresAt,
          })),
        });
      }
      return { batch, importedCount: toCreate.length, duplicateCount, invalidCount, totalRows: rows.length, mapping, sheetName, maxRows: MAX_IMPORT_ROWS };
    });
  }

  async paymentOptions(_user: RequestUser) {
    const settings = await this.prisma.paymentSettings.findMany({
      where: { active: true },
      orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }],
    });
    return settings.map((setting) => {
      const details = CHECKOUT_PROVIDER_DETAILS[setting.provider] ?? {
        name: setting.name || setting.provider,
        feeSummary: 'Taxas conforme contrato do provedor.',
        contractNotes: 'Confira credenciais, webhook e regras de liquidacao antes de ativar.',
        paymentMode: 'checkout',
      };
      return {
        id: setting.id,
        provider: setting.provider,
        name: setting.name || details.name,
        priority: setting.priority,
        paymentMode: details.paymentMode,
        feeSummary: details.feeSummary,
        contractNotes: details.contractNotes,
        instructions: setting.instructions || this.defaultCheckoutInstructions(setting.provider),
        requiresPayerTaxNumber: ['depix', 'depixpay', 'eulen'].includes(setting.provider),
      };
    });
  }

  async createOrder(user: RequestUser, dto: CreateRechargeCodeOrderDto) {
    if (isStaff(user)) throw new ForbiddenException('Use um usuario revendedor para criar pedido de compra.');
    await this.releaseExpiredReservations();
    const items = this.normalizeCart(dto);
    const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);
    return this.prisma.$transaction(async (tx) => {
      const productIds = items.map((item) => item.productId);
      const products = await tx.rechargeCodeProduct.findMany({ where: { id: { in: productIds }, active: true }, include: { server: true, modality: true } });
      if (products.length !== productIds.length) throw new BadRequestException('Produto indisponivel no carrinho.');
      let totalValue = 0;
      const order = await tx.rechargeCodeOrder.create({ data: { resellerId: user.sub, totalValue: 0, expiresAt } });

      for (const item of items) {
        const product = products.find((row) => row.id === item.productId)!;
        const unitValue = Number(product.saleValue);
        const total = unitValue * item.quantity;
        totalValue += total;
        const orderItem = await tx.rechargeCodeOrderItem.create({
          data: { orderId: order.id, productId: product.id, quantity: item.quantity, unitValue, totalValue: total },
        });
        const codes = await tx.rechargeCode.findMany({
          where: { productId: product.id, status: RechargeCodeStatus.available },
          orderBy: { createdAt: 'asc' },
          take: item.quantity,
        });
        if (codes.length < item.quantity) throw new BadRequestException(`Estoque indisponivel para ${product.name}.`);
        const update = await tx.rechargeCode.updateMany({
          where: { id: { in: codes.map((code) => code.id) }, status: RechargeCodeStatus.available },
          data: { status: RechargeCodeStatus.reserved, reservedAt: new Date(), reservedUntil: expiresAt, orderItemId: orderItem.id },
        });
        if (update.count !== item.quantity) throw new BadRequestException('Estoque mudou durante a reserva. Tente novamente.');
      }

      const selectedProvider = text(dto.provider);
      const settings = await tx.paymentSettings.findFirst({
        where: selectedProvider ? { provider: selectedProvider, active: true } : { active: true },
        orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }],
      });
      if (selectedProvider && !settings) throw new BadRequestException('Forma de pagamento indisponivel ou desativada.');
      const providerCheckout = settings?.provider
        ? await this.createProviderCheckout(settings, order.id, totalValue, dto)
        : null;
      const payment = await tx.rechargeCodePayment.create({
        data: {
          orderId: order.id,
          provider: settings?.provider ?? 'manual_pix',
          amount: totalValue,
          paymentCode: providerCheckout?.qrCode ?? settings?.pixKey ?? null,
          proofUrl: providerCheckout?.paymentUrl ?? null,
          providerRef: providerCheckout?.id ?? order.id,
          instructions: providerCheckout?.instructions ?? settings?.instructions ?? 'Realize o pagamento e aguarde a confirmacao do admin.',
          expiresAt,
        },
      });
      await tx.rechargeCodeOrder.update({ where: { id: order.id }, data: { totalValue } });
      return this.orderById(tx, order.id, user);
    });
  }

  async listOrders(user: RequestUser) {
    await this.releaseExpiredReservations();
    const orders = await this.prisma.rechargeCodeOrder.findMany({
      where: isStaff(user) ? {} : { resellerId: user.sub },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: this.orderInclude(),
    });
    return orders.map((order) => this.presentOrder(order, user));
  }

  async approvePayment(user: RequestUser, orderId: string, dto: ApproveRechargeCodePaymentDto) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas administradores aprovam pagamentos.');
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.rechargeCodeOrder.findUnique({ where: { id: orderId }, include: { payment: true, items: { include: { codes: true } } } });
      if (!order) throw new NotFoundException('Pedido nao encontrado.');
      if (order.status !== RechargeCodeOrderStatus.pending_payment) throw new BadRequestException('Pedido nao esta pendente.');
      await this.deliverPaidOrder(tx, order, text(dto.providerRef) || order.payment?.providerRef || order.id);
      return this.orderById(tx, orderId, user);
    });
  }

  async rejectPayment(user: RequestUser, orderId: string) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas administradores rejeitam pagamentos.');
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.rechargeCodeOrder.findUnique({ where: { id: orderId }, include: { items: { include: { codes: true } } } });
      if (!order) throw new NotFoundException('Pedido nao encontrado.');
      const codeIds = order.items.flatMap((item) => item.codes.map((code) => code.id));
      await tx.rechargeCode.updateMany({ where: { id: { in: codeIds }, status: RechargeCodeStatus.reserved }, data: { status: RechargeCodeStatus.available, orderItemId: null, reservedUntil: null } });
      await tx.rechargeCodePayment.update({ where: { orderId }, data: { status: RechargeCodePaymentStatus.rejected } });
      await tx.rechargeCodeOrder.update({ where: { id: orderId }, data: { status: RechargeCodeOrderStatus.failed } });
      return this.orderById(tx, orderId, user);
    });
  }

  async handlePaymentWebhook(providerParam: string, body: unknown, headers: Record<string, string>, rawBody?: string) {
    const provider = normalizeHeader(providerParam).replace(/-/g, '_');
    await this.assertWebhookSignature(provider, headers, rawBody);
    const event = this.extractPaymentWebhook(provider, body, headers);
    if (!event.reference) {
      return { received: true, matched: false, reason: 'Referencia do pedido ausente no webhook.' };
    }
    if (!event.paid) {
      return { received: true, matched: false, reference: event.reference, status: event.status || 'ignored' };
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.rechargeCodePayment.findFirst({
        where: {
          provider,
          OR: [{ orderId: event.reference }, { providerRef: event.reference }],
        },
        include: { order: { include: { items: { include: { codes: true } } } } },
      });
      if (!payment) return { received: true, matched: false, reference: event.reference };
      if (payment.status === RechargeCodePaymentStatus.approved || payment.order.status === RechargeCodeOrderStatus.delivered) {
        return { received: true, matched: true, orderId: payment.orderId, alreadyDelivered: true };
      }
      if (payment.order.status !== RechargeCodeOrderStatus.pending_payment) {
        return { received: true, matched: true, orderId: payment.orderId, ignored: payment.order.status };
      }
      await this.deliverPaidOrder(tx, payment.order, event.providerRef || event.reference);
      return { received: true, matched: true, orderId: payment.orderId, delivered: true };
    });
  }

  async listMyPurchases(user: RequestUser) {
    return this.listOrders(user);
  }

  async sellNextCode(user: RequestUser, productId: string, dto: SellRechargeCodeDto) {
    return this.sellCodes(user, productId, { ...dto, quantity: 1 });
  }

  async sellCodes(user: RequestUser, productId: string, dto: SellRechargeCodeDto) {
    if (!isStaff(user)) throw new ForbiddenException('Venda direta foi removida. Use o checkout com pedido e pagamento.');
    return this.createOrder({ ...user, role: 'reseller', sub: dto.resellerId || user.sub } as RequestUser, { items: [{ productId, quantity: dto.quantity || 1 }] });
  }

  private async deliverPaidOrder(tx: any, order: any, providerRef: string) {
    const now = new Date();
    const codeIds = order.items.flatMap((item: any) => item.codes.map((code: any) => code.id));
    if (!codeIds.length) throw new BadRequestException('Pedido sem codigos reservados para entregar.');
    await tx.rechargeCode.updateMany({
      where: { id: { in: codeIds }, status: RechargeCodeStatus.reserved },
      data: { status: RechargeCodeStatus.sold, soldToId: order.resellerId, soldAt: now, reservedUntil: null },
    });
    await tx.rechargeCodePayment.update({
      where: { orderId: order.id },
      data: { status: RechargeCodePaymentStatus.approved, paidAt: now, providerRef },
    });
    await tx.rechargeCodeOrder.update({
      where: { id: order.id },
      data: { status: RechargeCodeOrderStatus.delivered, paidAt: now, deliveredAt: now },
    });
    await tx.rechargeCodeDeliveryLog.createMany({
      data: codeIds.map((codeId: string) => ({ orderId: order.id, codeId, recipientId: order.resellerId })),
      skipDuplicates: true,
    });
  }

  private async createProviderCheckout(settings: any, orderId: string, totalValue: number, dto: CreateRechargeCodeOrderDto) {
    if (settings.provider === 'depix') return this.createDepixCheckout(settings, orderId, totalValue, dto);
    if (settings.provider === 'depixpay') return this.createDepixPayCheckout(settings, orderId, totalValue, dto);
    if (settings.provider === 'eulen') return this.createEulenPix2Depix(settings, orderId, totalValue, dto);
    return null;
  }

  private defaultCheckoutInstructions(provider: string) {
    if (provider === 'manual_pix') return 'Copie a chave PIX, pague pelo seu banco e aguarde a confirmacao do admin.';
    if (['depix', 'depixpay', 'eulen'].includes(provider)) return 'Informe CPF/CNPJ, gere o checkout PIX e conclua o pagamento pelo link ou QR Code exibido.';
    return 'Gere o pedido, siga as instrucoes do gateway e aguarde a confirmacao do pagamento.';
  }

  private payerTaxNumberOrThrow(dto: CreateRechargeCodeOrderDto) {
    const payerTaxNumber = digits(dto.payerTaxNumber);
    if (![11, 14].includes(payerTaxNumber.length)) {
      throw new BadRequestException('Informe CPF ou CNPJ valido para gerar checkout DePix.');
    }
    return payerTaxNumber;
  }

  private async createDepixCheckout(settings: any, orderId: string, totalValue: number, dto: CreateRechargeCodeOrderDto) {
    const payerTaxNumber = digits(dto.payerTaxNumber);
    if (![11, 14].includes(payerTaxNumber.length)) {
      throw new BadRequestException('Informe CPF ou CNPJ valido para gerar checkout DePix.');
    }
    if (totalValue < 5) {
      throw new BadRequestException('DePix exige pagamento minimo de R$ 5,00.');
    }
    const token = decryptSecret(settings.tokenRef);
    if (!token) throw new BadRequestException('Configure o token/API key do DePix antes de vender por DePix.');
    const callbackUrl =
      text(settings.webhookUrl) ||
      `${text(process.env.PUBLIC_API_URL || process.env.FRONTEND_ORIGIN || 'http://localhost:3333').replace(/\/$/, '')}/api/payment-webhooks/recharge-codes/depix`;
    const response = await fetch(`${DEPIX_API_BASE_URL}/api/checkouts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(totalValue * 100),
        payer_tax_number: payerTaxNumber,
        description: `Pedido ${orderId}`,
        expires_in: RESERVATION_MINUTES * 60,
        callback_url: callbackUrl,
        metadata: { order_id: orderId },
      }),
    });
    const result: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new BadRequestException(result?.message || result?.error || 'DePix recusou a criacao do checkout.');
    }
    return {
      id: text(result.id || result.checkout_id || result.data?.id || orderId),
      paymentUrl: text(result.payment_url || result.url || result.checkout_url || result.data?.payment_url || result.data?.url),
      qrCode: text(result.pix?.qr_code || result.qr_code || result.qrcode || result.pix_qr_code || result.data?.qr_code || result.data?.pix_qr_code),
      instructions: 'Pague pelo checkout DePix. Assim que o webhook confirmar o pagamento, os codigos serao liberados automaticamente.',
    };
  }

  private async createDepixPayCheckout(settings: any, orderId: string, totalValue: number, dto: CreateRechargeCodeOrderDto) {
    const payerTaxNumber = this.payerTaxNumberOrThrow(dto);
    const token = decryptSecret(settings.tokenRef);
    if (!token) throw new BadRequestException('Configure o token/API key do DePix Pay antes de vender por DePix Pay.');
    const webhookUrl =
      text(settings.webhookUrl) ||
      `${text(process.env.PUBLIC_API_URL || process.env.FRONTEND_ORIGIN || 'http://localhost:3333').replace(/\/$/, '')}/api/payment-webhooks/recharge-codes/depixpay`;
    const response = await fetch(`${text(process.env.DEPIXPAY_API_BASE_URL) || DEPIXPAY_API_BASE_URL}/api/v1/payment/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Number(totalValue.toFixed(2)),
        customer_cpf: payerTaxNumber,
        external_id: orderId,
        webhook_url: webhookUrl,
      }),
    });
    const result: any = await response.json().catch(() => ({}));
    if (!response.ok) throw new BadRequestException(result?.message || result?.error || 'DePix Pay recusou a criacao do pagamento.');
    return {
      id: text(result.id || result.payment_id || result.data?.id || orderId),
      paymentUrl: text(result.payment_url || result.checkout_url || result.url || result.data?.payment_url),
      qrCode: text(result.qr_code || result.pix_qr_code || result.qrcode || result.data?.qr_code),
      instructions: 'Pague pelo DePix Pay. Taxa publica informada: R$ 0,99 + 1%. Os codigos liberam apos webhook confirmado.',
    };
  }

  private async createEulenPix2Depix(settings: any, orderId: string, totalValue: number, dto: CreateRechargeCodeOrderDto) {
    const payerTaxNumber = this.payerTaxNumberOrThrow(dto);
    const token = decryptSecret(settings.tokenRef);
    const publicInfo = settings.publicInfo && typeof settings.publicInfo === 'object' ? settings.publicInfo : {};
    const depixAddress = text(publicInfo.depixAddress);
    if (!token) throw new BadRequestException('Configure o token/API key da Eulen antes de vender via Eulen.');
    if (!depixAddress) throw new BadRequestException('Configure o endereco Liquid/DePix da Eulen antes de ativar.');
    const body: Record<string, unknown> = {
      amountInCents: Math.round(totalValue * 100),
      depixAddress,
      endUserFullName: 'Revendedor Gestor J2',
      endUserTaxNumber: payerTaxNumber,
      metadata: { order_id: orderId },
    };
    if (text(publicInfo.depixSplitAddress)) body.depixSplitAddress = text(publicInfo.depixSplitAddress);
    if (publicInfo.splitFee !== null && publicInfo.splitFee !== undefined && Number(publicInfo.splitFee) >= 0) body.splitFee = `${Number(publicInfo.splitFee)}%`;
    if (publicInfo.delayDepixInHours !== null && publicInfo.delayDepixInHours !== undefined && Number(publicInfo.delayDepixInHours) >= 0) {
      body.delayDepixInHours = Number(publicInfo.delayDepixInHours);
    }
    const response = await fetch(`${text(process.env.EULEN_API_BASE_URL) || EULEN_API_BASE_URL}/api/deposit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const result: any = await response.json().catch(() => ({}));
    if (!response.ok) throw new BadRequestException(result?.message || result?.error || 'Eulen recusou a criacao do Pix2DePix.');
    return {
      id: text(result.id || result.depositId || result.data?.id || orderId),
      paymentUrl: text(result.response?.qrImageUrl || result.paymentUrl || result.url || result.data?.paymentUrl),
      qrCode: text(result.response?.qrCopyPaste || result.qrCode || result.qr_code || result.pixQrCode || result.data?.qrCode),
      instructions: 'Pague o Pix gerado pela Eulen Pix2DePix. Taxa depende do contrato Eulen; use essa rota para negociar menor custo.',
    };
  }

  private async assertWebhookSignature(provider: string, headers: Record<string, string>, rawBody?: string) {
    if (provider !== 'depix') return;
    const signature = text(headers['x-depix-signature'] || headers['X-DePix-Signature']);
    if (!signature) return;
    const settings = await this.prisma.paymentSettings.findFirst({ where: { provider: 'depix', active: true } });
    const secret = decryptSecret(settings?.webhookSecretRef);
    if (!secret || !rawBody) return;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(signature.replace(/^sha256=/, ''), 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new BadRequestException('Assinatura DePix invalida.');
  }

  private extractPaymentWebhook(provider: string, body: unknown, _headers: Record<string, string>) {
    const payload = (body && typeof body === 'object' ? body : {}) as any;
    const firstPix = Array.isArray(payload.pix) ? payload.pix[0] : undefined;
    const status = text(payload.status || payload.event || payload.action || payload.type || payload.payment?.status || firstPix?.status);
    const paidStatuses = new Set([
      'approved',
      'paid',
      'confirmed',
      'received',
      'payment_received',
      'payment_confirmed',
      'concluida',
      'liquidado',
      'pix',
    ]);

    if (provider === 'mercadopago') {
      const reference = text(payload.external_reference || payload.externalReference || payload.data?.external_reference || payload.metadata?.order_id || payload.orderId);
      return {
        reference,
        providerRef: text(payload.data?.id || payload.id || reference),
        status,
        paid: paidStatuses.has(normalizeHeader(status)),
      };
    }

    if (provider === 'depix') {
      const reference = text(payload.metadata?.order_id || payload.data?.metadata?.order_id || payload.order_id || payload.externalReference);
      const event = normalizeHeader(payload.event || payload.type || payload.status || payload.data?.status);
      return {
        reference,
        providerRef: text(payload.checkout_id || payload.id || payload.data?.id || reference),
        status: event,
        paid: event === 'checkout.completed' || event === 'completed' || event === 'approved' || event === 'paid',
      };
    }

    if (provider === 'depixpay') {
      const reference = text(payload.external_id || payload.externalId || payload.data?.external_id || payload.metadata?.order_id);
      const event = normalizeHeader(payload.event || payload.type || payload.status || payload.data?.status);
      return {
        reference,
        providerRef: text(payload.payment_id || payload.id || payload.data?.id || reference),
        status: event,
        paid: event === 'payment.completed' || event === 'payment_completed' || event === 'completed' || event === 'paid' || event === 'approved',
      };
    }

    if (provider === 'eulen') {
      const reference = text(payload.metadata?.order_id || payload.data?.metadata?.order_id || payload.orderId || payload.externalId || payload.id);
      const event = normalizeHeader(payload.event || payload.type || payload.status || payload.data?.status);
      return {
        reference,
        providerRef: text(payload.depositId || payload.id || payload.data?.id || reference),
        status: event,
        paid: event === 'deposit.completed' || event === 'deposit_completed' || event === 'completed' || event === 'paid' || event === 'confirmed',
      };
    }

    if (provider === 'asaas') {
      const reference = text(payload.payment?.externalReference || payload.externalReference || payload.orderId || payload.payment?.id);
      const event = normalizeHeader(payload.event);
      return {
        reference,
        providerRef: text(payload.payment?.id || payload.id || reference),
        status: text(payload.event || payload.payment?.status),
        paid: event === 'payment_received' || event === 'payment_confirmed' || paidStatuses.has(normalizeHeader(payload.payment?.status)),
      };
    }

    if (provider === 'efi' || provider === 'banco_inter') {
      const reference = text(firstPix?.txid || payload.txid || payload.cob?.txid || payload.orderId || payload.externalReference);
      return {
        reference,
        providerRef: text(firstPix?.endToEndId || payload.endToEndId || payload.id || reference),
        status: status || 'pix',
        paid: Boolean(firstPix || payload.txid || paidStatuses.has(normalizeHeader(status))),
      };
    }

    const reference = text(payload.orderId || payload.providerRef || payload.external_reference || payload.externalReference || payload.txid);
    return {
      reference,
      providerRef: text(payload.paymentId || payload.id || reference),
      status,
      paid: paidStatuses.has(normalizeHeader(status)),
    };
  }

  private async productOrThrow(productId: string) {
    const product = await this.prisma.rechargeCodeProduct.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produto de codigo nao encontrado.');
    return product;
  }

  private async resolveImportTargets(fallbackProductId: string, rows: ParsedImportRow[]) {
    const products = await this.prisma.rechargeCodeProduct.findMany({
      include: { server: { select: { name: true } }, modality: { select: { name: true } } },
    });
    return rows.map((row) => {
      const product = row.serverName || row.modalityName
        ? products.find((item) =>
            (!row.serverName || normalizeHeader(item.server?.name) === normalizeHeader(row.serverName)) &&
            (!row.modalityName || normalizeHeader(item.modality?.name) === normalizeHeader(row.modalityName)))
        : products.find((item) => item.id === fallbackProductId);
      return { ...row, productId: product?.id ?? null, productName: product?.name ?? '' };
    });
  }

  private normalizeCart(dto: CreateRechargeCodeOrderDto) {
    const merged = new Map<string, number>();
    for (const item of dto.items || []) {
      const quantity = Math.trunc(Number(item.quantity || 0));
      if (!item.productId || quantity < 1) throw new BadRequestException('Carrinho invalido.');
      merged.set(item.productId, (merged.get(item.productId) || 0) + quantity);
    }
    if (!merged.size) throw new BadRequestException('Adicione pelo menos um item ao carrinho.');
    return [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }));
  }

  private async releaseExpiredReservations() {
    const now = new Date();
    const expired = await this.prisma.rechargeCodeOrder.findMany({
      where: { status: RechargeCodeOrderStatus.pending_payment, expiresAt: { lt: now } },
      select: { id: true },
      take: 200,
    });
    if (!expired.length) return;
    const orderIds = expired.map((order) => order.id);
    await this.prisma.$transaction([
      this.prisma.rechargeCode.updateMany({
        where: { orderItem: { orderId: { in: orderIds } }, status: RechargeCodeStatus.reserved },
        data: { status: RechargeCodeStatus.available, orderItemId: null, reservedUntil: null },
      }),
      this.prisma.rechargeCodePayment.updateMany({ where: { orderId: { in: orderIds }, status: RechargeCodePaymentStatus.pending }, data: { status: RechargeCodePaymentStatus.expired } }),
      this.prisma.rechargeCodeOrder.updateMany({ where: { id: { in: orderIds } }, data: { status: RechargeCodeOrderStatus.expired } }),
    ]);
  }

  private orderInclude() {
    return {
      reseller: { select: { id: true, name: true, email: true } },
      payment: true,
      items: {
        include: {
          product: { include: { server: { select: { id: true, name: true } }, modality: { select: { id: true, name: true, durationDays: true } } } },
          codes: { orderBy: { createdAt: 'asc' } as const },
        },
      },
    };
  }

  private async orderById(tx: Prisma.TransactionClient, orderId: string, user: RequestUser) {
    const order = await tx.rechargeCodeOrder.findUnique({ where: { id: orderId }, include: this.orderInclude() });
    if (!order) throw new NotFoundException('Pedido nao encontrado.');
    return this.presentOrder(order, user);
  }

  private presentOrder(order: any, user: RequestUser) {
    const canSeeCodes = isStaff(user) || ['paid', 'delivered'].includes(order.status);
    return {
      ...order,
      items: order.items.map((item: any) => ({
        ...item,
        codes: canSeeCodes ? item.codes : [],
      })),
    };
  }
}
