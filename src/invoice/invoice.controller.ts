import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UpdateInvoiceStatusDto } from '../dto/update-invoice.dto';
import { UpdateInvoiceDraftDto } from '../dto/update-invoicedraft.dto';
import { InvoiceService } from './invoice.service';
import { Types } from 'mongoose';
import type { AuthRequest } from 'src/auth/auth-request';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Res } from '@nestjs/common';
import type { Response } from 'express';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        if (file.mimetype !== 'application/pdf') {
          callback(
            new BadRequestException('Only PDF files are allowed'),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  uploadInvoice(
    @Req() req: AuthRequest,
    @UploadedFile() file: any,
    @Body() body: { note?: string; uploadedBy?: string },
  ) {
    return this.invoiceService.uploadInvoice(
      new Types.ObjectId(req.user.userId),
      file,
      body,
    );
  }

  @Get('all')
  findAll(@Req() req: AuthRequest) {
    return this.invoiceService.findAll(new Types.ObjectId(req.user.userId));
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.invoiceService.findOne(id);
  // }

  @Get(':id')
  getInvoiceFile(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.invoiceService.getInvoiceFile(
      new Types.ObjectId(req.user.userId),
      id,
      res,
    );
  }

  @Patch(':id/draft')
  createDraft(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() draft: UpdateInvoiceDraftDto,
  ) {
    return this.invoiceService.createDraft(
      new Types.ObjectId(req.user.userId),
      id,
      draft,
    );
  }

  @Post(':id/attachments')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  attachFiles(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @UploadedFiles() files: any[],
  ) {
    return this.invoiceService.attachFiles(
      new Types.ObjectId(req.user.userId),
      id,
      files,
    );
  }

  @Patch(':id/status')
  updateStatus(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() updateDto: UpdateInvoiceStatusDto,
  ) {
    return this.invoiceService.updateStatus(
      new Types.ObjectId(req.user.userId),
      id,
      updateDto,
    );
  }

  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.invoiceService.remove(new Types.ObjectId(req.user.userId), id);
  }
}