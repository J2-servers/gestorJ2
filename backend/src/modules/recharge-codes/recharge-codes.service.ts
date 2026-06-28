import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RechargeCodeStatus } from '@prisma/client';
import * as XLSX from 'xlsx';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ImportRechargeCodesDto, SellRechargeCodeDto, UpsertRechargeCodeProductDto, VoidRechargeCodeDto } from './dto';

type ImportRow = Record<string, unknown>;
type ParsedImportRow = { code: string; pin: string; serial: string; expiresAt: Date | null; rowNumber: number };

const MAX_IMPORT_ROWS = 50000;
const CREATE_CHUNK_SIZE = 1000;
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

function normalizeHeader(value: unknown) {
  return text(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}

function pick(row: ImportRow, names: string[]) {
  const entries = Object.entries(row);
  const found = entries.find(([key]) => names.includes(normalizeHeader(key)));
  return found?.[1];
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
    codeColumn: text(dto.codeColumn) || suggestColumn(headers, ['code', 'codigo', 'código', 'voucher', 'cartao', 'cartão']),
    pinColumn: text(dto.pinColumn) || suggestColumn(headers, ['pin', 'senha', 'password']),
    serialColumn: text(dto.serialColumn) || suggestColumn(headers, ['serial', 'serie', 'série', 'lote']),
    expiresAtColumn: text(dto.expiresAtColumn) || suggestColumn(headers, ['expires_at', 'validade', 'expira', 'vencimento']),
  };
}

function parseImportRows(rows: ImportRow[], dto: ImportRechargeCodesDto) {
  return rows.map<ParsedImportRow>((row, index) => ({
    code: text(valueByColumn(row, dto.codeColumn, ['code', 'codigo', 'código', 'voucher', 'cartao', 'cartão'])),
    pin: text(valueByColumn(row, dto.pinColumn, ['pin', 'senha', 'password'])),
    serial: text(valueByColumn(row, dto.serialColumn, ['serial', 'serie', 'série', 'lote'])),
    expiresAt: parseDate(valueByColumn(row, dto.expiresAtColumn, ['expires_at', 'validade', 'expira', 'vencimento'])),
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

  async listProducts(user: RequestUser) {
    const products = await this.prisma.rechargeCodeProduct.findMany({
      where: isStaff(user) ? {} : { active: true },
      include: {
        server: { select: { id: true, name: true } },
        _count: { select: { codes: true } },
      },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });

    const stock = await this.prisma.rechargeCode.groupBy({
      by: ['productId', 'status'],
      _count: { _all: true },
      where: { productId: { in: products.map((item) => item.id) } },
    });

    return products.map((product) => ({
      ...product,
      stock: {
        total: product._count.codes,
        available: stock.find((item) => item.productId === product.id && item.status === RechargeCodeStatus.available)?._count._all ?? 0,
        reserved: stock.find((item) => item.productId === product.id && item.status === RechargeCodeStatus.reserved)?._count._all ?? 0,
        sold: stock.find((item) => item.productId === product.id && item.status === RechargeCodeStatus.sold)?._count._all ?? 0,
        voided: stock.find((item) => item.productId === product.id && item.status === RechargeCodeStatus.voided)?._count._all ?? 0,
      },
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
    return this.prisma.rechargeCodeBatch.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async listCodes(user: RequestUser, productId: string, status?: RechargeCodeStatus) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas equipe interna consulta codigos.');
    return this.prisma.rechargeCode.findMany({
      where: { productId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { soldTo: { select: { id: true, name: true, email: true } } },
    });
  }

  async listSales(user: RequestUser, productId?: string) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas equipe interna consulta vendas de codigos.');
    return this.prisma.rechargeCode.findMany({
      where: {
        status: RechargeCodeStatus.sold,
        ...(productId ? { productId } : {}),
      },
      orderBy: { soldAt: 'desc' },
      take: 300,
      include: {
        product: { select: { id: true, name: true, saleValue: true, denomination: true } },
        soldTo: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async voidCode(user: RequestUser, codeId: string, dto: VoidRechargeCodeDto) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas equipe interna gerencia codigos.');
    const code = await this.prisma.rechargeCode.findUnique({ where: { id: codeId } });
    if (!code) throw new NotFoundException('Codigo nao encontrado.');
    if (code.status === RechargeCodeStatus.sold) {
      throw new BadRequestException('Codigo vendido nao pode ser inutilizado por aqui.');
    }
    if (code.status === RechargeCodeStatus.voided) return code;
    return this.prisma.rechargeCode.update({
      where: { id: codeId },
      data: {
        status: RechargeCodeStatus.voided,
        voidReason: text(dto.reason) || 'Inutilizado manualmente',
      },
      include: { product: true },
    });
  }

  async previewXlsx(user: RequestUser, productId: string, file: Express.Multer.File | undefined, dto: ImportRechargeCodesDto) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas administradores importam estoque.');
    const product = await this.prisma.rechargeCodeProduct.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produto de codigo nao encontrado.');
    validateXlsxFile(file);

    const { workbook, sheetName, headers, rows } = readImportSheet(file!, dto.sheetName);
    const mapping = buildMapping(headers, dto);
    const parsed = parseImportRows(rows, { ...dto, ...mapping });
    const valid = parsed.filter((row) => row.code.length >= 4);
    const uniqueCodes = [...new Set(valid.map((row) => row.code))];
    const existing = uniqueCodes.length
      ? await this.prisma.rechargeCode.findMany({ where: { code: { in: uniqueCodes } }, select: { code: true } })
      : [];
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
      invalidCount: parsed.length - valid.length,
      duplicateInFileCount,
      duplicateInSystemCount: existingCodes.size,
      importableCount,
      sampleRows: parsed.slice(0, 12).map((row) => ({
        rowNumber: row.rowNumber,
        code: row.code,
        pin: row.pin,
        serial: row.serial,
        expiresAt: row.expiresAt,
        valid: row.code.length >= 4,
        duplicateInSystem: existingCodes.has(row.code),
      })),
      invalidSamples: parsed.filter((row) => row.code.length < 4).slice(0, 25).map((row) => ({
        rowNumber: row.rowNumber,
        reason: 'Codigo ausente ou menor que 4 caracteres.',
      })),
      limits: { maxRows: MAX_IMPORT_ROWS, maxFileSizeMb: 20 },
    };
  }

  async importXlsx(user: RequestUser, productId: string, file: Express.Multer.File | undefined, dto: ImportRechargeCodesDto) {
    if (!isStaff(user)) throw new ForbiddenException('Apenas administradores importam estoque.');
    const product = await this.prisma.rechargeCodeProduct.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produto de codigo nao encontrado.');
    validateXlsxFile(file);

    const { sheetName, headers, rows } = readImportSheet(file!, dto.sheetName);
    const mapping = buildMapping(headers, dto);
    if (!mapping.codeColumn) throw new BadRequestException('Selecione a coluna que contem o codigo.');

    const parsed = parseImportRows(rows, { ...dto, ...mapping });
    const valid = parsed.filter((row) => row.code.length >= 4);
    const invalidCount = parsed.length - valid.length;
    const uniqueCodes = [...new Set(valid.map((row) => row.code))];
    const existing = uniqueCodes.length
      ? await this.prisma.rechargeCode.findMany({ where: { code: { in: uniqueCodes } }, select: { code: true } })
      : [];
    const existingCodes = new Set(existing.map((row) => row.code));
    const toCreate = valid.filter((row, index, all) => {
      if (existingCodes.has(row.code)) return false;
      return all.findIndex((item) => item.code === row.code) === index;
    });
    const duplicateCount = valid.length - toCreate.length;

    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.rechargeCodeBatch.create({
        data: {
          productId,
          importedById: user.sub,
          sourceFilename: file!.originalname,
          notes: [text(dto.notes), `Aba: ${sheetName}`, `Colunas: codigo=${mapping.codeColumn}; pin=${mapping.pinColumn || '-'}; serial=${mapping.serialColumn || '-'}; validade=${mapping.expiresAtColumn || '-'}`]
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
            productId,
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

  async sellNextCode(user: RequestUser, productId: string, dto: SellRechargeCodeDto) {
    return this.sellCodes(user, productId, { ...dto, quantity: 1 });
  }

  async sellCodes(user: RequestUser, productId: string, dto: SellRechargeCodeDto) {
    const product = await this.prisma.rechargeCodeProduct.findUnique({ where: { id: productId } });
    if (!product || (!product.active && !isStaff(user))) throw new NotFoundException('Produto indisponivel.');
    const soldToId = isStaff(user) && dto.resellerId ? dto.resellerId : user.sub;
    const quantity = Math.trunc(Number(dto.quantity || 1));
    if (!Number.isFinite(quantity) || quantity < 1) throw new BadRequestException('Quantidade invalida.');
    if (quantity > 100) throw new BadRequestException('Venda no maximo 100 codigos por vez.');

    return this.prisma.$transaction(async (tx) => {
      const available = await tx.rechargeCode.count({
        where: { productId, status: RechargeCodeStatus.available },
      });
      if (available < quantity) {
        throw new BadRequestException(`Estoque insuficiente. Disponivel: ${available}. Solicitado: ${quantity}.`);
      }

      const codes = await tx.rechargeCode.findMany({
        where: { productId, status: RechargeCodeStatus.available },
        orderBy: { createdAt: 'asc' },
        take: quantity,
      });
      if (codes.length < quantity) {
        throw new BadRequestException(`Estoque insuficiente. Disponivel: ${codes.length}. Solicitado: ${quantity}.`);
      }

      const soldAt = new Date();
      const update = await tx.rechargeCode.updateMany({
        where: {
          id: { in: codes.map((item) => item.id) },
          status: RechargeCodeStatus.available,
        },
        data: { status: RechargeCodeStatus.sold, soldToId, soldAt },
      });
      if (update.count !== quantity) {
        throw new BadRequestException('Estoque mudou durante a venda. Tente novamente.');
      }

      const soldCodes = await tx.rechargeCode.findMany({
        where: { id: { in: codes.map((item) => item.id) } },
        include: { product: true },
        orderBy: { createdAt: 'asc' },
      });

      return {
        product,
        quantity,
        totalValue: Number(product.saleValue) * quantity,
        soldAt,
        codes: soldCodes,
      };
    });
  }
}
