import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import pdfParse from 'pdf-parse';
import { InvoiceService } from './invoice.service';

jest.mock('pdf-parse', () => jest.fn());

describe('InvoiceService', () => {
  let service: InvoiceService;

  const mockInvoiceModel = {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        {
          provide: getModelToken('Invoice'),
          useValue: mockInvoiceModel,
        },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
    jest.clearAllMocks();
  });

  it('should upload a PDF invoice and save its metadata', async () => {
    const file = {
      originalname: 'invoice.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4'),
    };

    (pdfParse as jest.Mock).mockResolvedValue({
      text: 'Invoice Number: INV-1001\nCustomer Name: Jane Doe\nCustomer Email: jane@example.com\nAmount Due: 250.00\nDue Date: 2026-08-01',
    });

    const createdInvoice = {
      fileName: 'invoice.pdf',
      originalName: 'invoice.pdf',
      mimeType: 'application/pdf',
      status: 'pending',
    };

    mockInvoiceModel.create.mockResolvedValue(createdInvoice);

    const result = await service.uploadInvoice(file as any, { note: 'Monthly invoice' });

    expect(mockInvoiceModel.create).toHaveBeenCalled();
    expect(result.status).toBe('pending');
    expect(result.mimeType).toBe('application/pdf');
  });
});
