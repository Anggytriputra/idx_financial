import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  ParseIntPipe,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(new BadRequestException('Hanya file PDF yang diperbolehkan'), false);
        }
        cb(null, true);
      },
    }),
  )
  async upload(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body('companyId') companyId: string,
    @Body('year') year: string,
    @Body('quarter') quarter: string,
  ) {
    if (!file) throw new BadRequestException('File PDF wajib diupload');
    if (!companyId) throw new BadRequestException('companyId wajib diisi');
    if (!year) throw new BadRequestException('year wajib diisi');

    return this.reportsService.uploadAndExtract(
      req.user.id,
      companyId,
      parseInt(year),
      parseInt(quarter ?? '4'),
      file,
    );
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body() body: { extractedData?: any },
  ) {
    return this.reportsService.confirmExtraction(id, req.user.id, body?.extractedData);
  }

  @Get('company/:companyId')
  findByCompany(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Request() req,
  ) {
    return this.reportsService.findByCompany(companyId, req.user.id);
  }
}
