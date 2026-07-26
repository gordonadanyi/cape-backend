import { Controller, Get, Headers, Param, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentService } from './payment.service';
import { verify } from 'crypto';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initialize/:invoiceId')
  async initialize(@Param('invoiceId') invoiceId: string) {
    return this.paymentService.initializePayment(invoiceId);
  }

  /**
   * Deliberately NOT behind JwtAuthGuard — this is called by Paystack's
   * own servers, not a logged-in Cape user. Authenticity is instead
   * verified inside the service via the x-paystack-signature header
   * (see PaymentService.verifyWebhookSignature).
   */
  @Post('webhook')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
  ) {
    // req.rawBody is populated because main.ts creates the app with
    // { rawBody: true } — needed since signature verification must run
    // over the exact bytes Paystack sent, not the parsed/re-serialized body.
    await this.paymentService.handleWebhook(req.rawBody as Buffer, signature);
    return { received: true };
  }

  @Get('verify/:reference')
  async verify(@Param('reference') reference: string) {
    return this.paymentService.verifyPayment(reference);
  }
}
