import { BadRequestException, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

const ALLOWED_UPLOAD_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'application/pdf']);

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const maxUploadMb = Number(config.get<string>('MAX_UPLOAD_MB') || 10);

        return {
          limits: {
            fileSize: maxUploadMb * 1024 * 1024,
            files: 1,
          },
          fileFilter: (_request, file, callback) => {
            if (ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype)) {
              callback(null, true);
              return;
            }

            callback(new BadRequestException('Tipo de arquivo nao permitido. Use JPG, PNG, GIF ou PDF.'), false);
          },
        };
      },
    }),
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
