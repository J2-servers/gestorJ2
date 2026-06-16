import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, stat, writeFile } from 'fs/promises';
import { extname, isAbsolute, join, resolve } from 'path';

export type UploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
};

type StoredUpload = {
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  fileUrl: string;
  path: string;
};

const ALLOWED_TYPES: Record<string, string[]> = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.gif': ['image/gif'],
  '.pdf': ['application/pdf'],
};

@Injectable()
export class UploadsService {
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    const configuredDir = this.config.get<string>('UPLOAD_DIR') || 'uploads';
    this.uploadDir = isAbsolute(configuredDir) ? configuredDir : resolve(process.cwd(), configuredDir);
  }

  async save(file: UploadedFile | undefined): Promise<StoredUpload> {
    if (!file) {
      throw new BadRequestException('Arquivo nao enviado.');
    }

    if (!file.buffer?.length) {
      throw new BadRequestException('Arquivo vazio ou invalido.');
    }

    const extension = extname(file.originalname).toLowerCase();
    const allowedMimeTypes = ALLOWED_TYPES[extension];

    if (!allowedMimeTypes?.includes(file.mimetype) || !this.hasValidSignature(extension, file.buffer)) {
      throw new BadRequestException('Tipo de arquivo nao permitido. Use JPG, PNG, GIF ou PDF.');
    }

    await mkdir(this.uploadDir, { recursive: true });

    const filename = `${randomUUID()}${extension === '.jpeg' ? '.jpg' : extension}`;
    const absolutePath = join(this.uploadDir, filename);

    await writeFile(absolutePath, file.buffer, { flag: 'wx' });

    return {
      originalName: file.originalname,
      filename,
      mimeType: file.mimetype,
      size: file.size,
      fileUrl: `/api/uploads/${filename}`,
      path: `uploads/${filename}`,
    };
  }

  async getAbsolutePath(filename: string): Promise<string> {
    if (!/^[a-f0-9-]{36}\.(jpg|png|gif|pdf)$/.test(filename)) {
      throw new BadRequestException('Nome de arquivo invalido.');
    }

    const absolutePath = join(this.uploadDir, filename);
    const resolvedPath = resolve(absolutePath);

    if (!resolvedPath.startsWith(resolve(this.uploadDir))) {
      throw new BadRequestException('Nome de arquivo invalido.');
    }

    try {
      const fileStat = await stat(resolvedPath);

      if (!fileStat.isFile()) {
        throw new NotFoundException('Arquivo nao encontrado.');
      }

      return resolvedPath;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new NotFoundException('Arquivo nao encontrado.');
    }
  }

  private hasValidSignature(extension: string, buffer: Buffer): boolean {
    if (extension === '.jpg' || extension === '.jpeg') {
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    if (extension === '.png') {
      return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }

    if (extension === '.gif') {
      const header = buffer.subarray(0, 6).toString('ascii');
      return header === 'GIF87a' || header === 'GIF89a';
    }

    if (extension === '.pdf') {
      return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    }

    return false;
  }
}
