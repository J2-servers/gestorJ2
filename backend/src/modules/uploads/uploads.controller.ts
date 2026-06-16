import { Controller, Get, Param, Post, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { UploadedFile as UploadedFileData, UploadsService } from './uploads.service';

@UseGuards(AuthGuard('jwt'))
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(@UploadedFile() file: UploadedFileData | undefined) {
    return this.uploads.save(file);
  }

  @Get(':filename')
  async findOne(@Param('filename') filename: string, @Res() response: Response) {
    const absolutePath = await this.uploads.getAbsolutePath(filename);
    return response.sendFile(absolutePath);
  }
}
