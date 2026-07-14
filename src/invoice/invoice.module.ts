import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { Invoice, InvoiceSchema } from '../schema/invoice.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Invoice.name, schema: InvoiceSchema }])],
  controllers: [InvoiceController],
  providers: [InvoiceService],
})
export class InvoiceModule {}
