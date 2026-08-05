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
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateInvoiceDto } from 'src/dto/create-invoice.dto';

@ApiBearerAuth()
@ApiTags('invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload invoice' })
  @ApiResponse({
    status: 201,
    description: 'Task Created',
    type: CreateInvoiceDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid document',
  })
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

  @Post(':id/send')
  @ApiOperation({ summary: 'Send Invoice' })
  @ApiOkResponse({ description: 'Invoice Sent' })
  sendInvoice(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.invoiceService.sendInvoice(
      new Types.ObjectId(req.user.userId),
      id,
    );
  }

  // @Post('schedule')

  // @Post('reminder')

  @Get('all')
  @ApiOperation({ summary: 'Fetch all Invoices' })
  @ApiOkResponse({ description: 'All Invoices fetched successfully' })
  findAll(@Req() req: AuthRequest) {
    return this.invoiceService.findAll(new Types.ObjectId(req.user.userId));
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.invoiceService.findOne(id);
  // }

  @Get(':id/details')
  @ApiOperation({ summary: 'Fetch details by id' })
  @ApiOkResponse({ description: 'details fetched successfully' })
  findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.invoiceService.findOne(new Types.ObjectId(req.user.userId), id);
  }

  @Get(':id/receipt')
  @ApiOperation({ summary: 'Fetch reciept by id' })
  @ApiOkResponse({ description: 'reciept fetched successfully' })
  getReceiptFile(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.invoiceService.getReceiptFile(
      new Types.ObjectId(req.user.userId),
      id,
      res,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch Invoice by id' })
  @ApiOkResponse({ description: 'Invoice fetched successfully' })
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
  @ApiOperation({ summary: 'Update Invoice by id' })
  @ApiOkResponse({
    description: 'Invoice Updated successfully',
    type: UpdateInvoiceDraftDto,
  })
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
  @ApiOperation({ summary: 'Update Invoice Status by id' })
  @ApiOkResponse({
    description: 'Invoice Status Updated successfully',
    type: UpdateInvoiceStatusDto,
  })
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
  @ApiOperation({ summary: 'Delete Invoice by id' })
  @ApiOkResponse({ description: 'Invoice Deleted successfully' })
  remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.invoiceService.remove(new Types.ObjectId(req.user.userId), id);
  }
}
