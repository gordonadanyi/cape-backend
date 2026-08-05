import { Controller, Get, Headers, Param, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { PaymentService } from './payment.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initialize/:invoiceId')
  @ApiOperation({ summary: 'Create a Paystack payment link for an invoice' })
  @ApiParam({
    name: 'invoiceId',
    example: '65f1c8b5f2e4a6a6f0c7b001',
    description: 'MongoDB invoice id.',
  })
  @ApiOkResponse({
    description: 'Payment link initialized.',
    schema: {
      example: {
        authorization_url: 'https://checkout.paystack.com/abc123',
        reference: 'INV_65f1c8b5f2e4a6a6f0c7b001_1710000000000',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invoice is already paid or missing payment details.',
  })
  @ApiNotFoundResponse({ description: 'Invoice not found.' })
  async initialize(@Param('invoiceId') invoiceId: string) {
    return this.paymentService.initializePayment(invoiceId);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Receive Paystack webhook events' })
  @ApiHeader({
    name: 'x-paystack-signature',
    required: true,
    description: 'Paystack HMAC SHA512 webhook signature.',
  })
  @ApiBody({
    schema: {
      example: {
        event: 'charge.success',
        data: {
          reference: 'INV_65f1c8b5f2e4a6a6f0c7b001_1710000000000',
          amount: 15000000,
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Webhook accepted.',
    schema: { example: { received: true } },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid webhook signature.' })
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
  ) {
    await this.paymentService.handleWebhook(req.rawBody as Buffer, signature);
    return { received: true };
  }

  @Get('verify/:reference')
  @ApiOperation({ summary: 'Verify a Paystack payment reference' })
  @ApiParam({
    name: 'reference',
    example: 'INV_65f1c8b5f2e4a6a6f0c7b001_1710000000000',
    description: 'Paystack transaction reference stored on the invoice.',
  })
  @ApiOkResponse({
    description: 'Payment verification result.',
    schema: {
      example: {
        status: 'paid',
        invoiceId: '65f1c8b5f2e4a6a6f0c7b001',
        invoiceNumber: 'INV-001',
        customerName: 'Ada Lovelace',
        amountPaid: 150000,
        amountDue: 150000,
        paidAt: '2026-08-01T10:30:00.000Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'No invoice found for this reference.' })
  async verify(@Param('reference') reference: string) {
    return this.paymentService.verifyPayment(reference);
  }
}
