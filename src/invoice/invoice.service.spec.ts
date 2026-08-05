import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { getQueueToken } from '@nestjs/bullmq';
import { Types } from 'mongoose';
import pdfParse from 'pdf-parse';
import { InvoiceService } from './invoice.service';
import { Settings } from 'src/schema/settings.schema';
import { MailerService } from 'src/mailer/mailer.service';
import { PaymentService } from 'src/payment/payment.service';
import { INVOICE_SENDING_QUEUE } from 'src/types/invoice-send-job.types';

jest.mock('pdf-parse', () => jest.fn());

describe('InvoiceService', () => {
  let service: InvoiceService;

  const mockInvoiceModel = {
    create: jest.fn(),
  };

  const mockSettingsModel = {
    findOne: jest.fn(),
  };

  const mockMailerService = {
    sendInvoiceEmail: jest.fn(),
  };

  const mockInvoiceQueue = {
    add: jest.fn(),
    getJob: jest.fn(),
  };

  const mockPaymentService = {
    initializePayment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        {
          provide: getModelToken('Invoice'),
          useValue: mockInvoiceModel,
        },
        {
          provide: getModelToken(Settings.name),
          useValue: mockSettingsModel,
        },
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
        {
          provide: getQueueToken(INVOICE_SENDING_QUEUE),
          useValue: mockInvoiceQueue,
        },
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
    jest.clearAllMocks();
  });

  it('should upload a PDF invoice and save its metadata', async () => {
    const userId = new Types.ObjectId();
    const file = {
      originalname: 'invoice.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4'),
    };

    (pdfParse as jest.Mock).mockResolvedValue({
      text: 'Invoice Number: INV-1001\nCustomer Name: Jane Doe\nCustomer Email: jane@example.com\nAmount Due: 250.00\nDue Date: 2026-08-01',
    });

    const createdInvoice = {
      userId,
      fileName: '123-invoice.pdf',
      originalName: 'invoice.pdf',
      mimeType: 'application/pdf',
      status: 'pending',
    };

    mockInvoiceModel.create.mockResolvedValue(createdInvoice);

    const result = await service.uploadInvoice(userId, file as any, {
      note: 'Monthly invoice',
    });

    expect(mockInvoiceModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        originalName: 'invoice.pdf',
        mimeType: 'application/pdf',
        status: 'pending',
        note: 'Monthly invoice',
      }),
    );
    expect(result.status).toBe('pending');
    expect(result.mimeType).toBe('application/pdf');
  });
});
