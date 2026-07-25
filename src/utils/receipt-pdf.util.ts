import PDFDocument from 'pdfkit';
import { Invoice } from '../schema/invoice.schema';
import { Settings } from '../schema/settings.schema';

/**
 * Generates a receipt PDF for a paid invoice. Deliberately a pure
 * function of (invoice, settings) rather than something that reads from
 * or writes to the database — a paid invoice's core facts don't change,
 * so this can be called fresh every time (on payment, and again whenever
 * someone downloads it) without needing to persist the PDF bytes anywhere.
 */
export function generateReceiptPdf(
  invoice: Invoice,
  settings: Settings | null,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const companyName = settings?.branding?.companyName || 'Your Business';
    const website = settings?.branding?.website;
    const address = settings?.branding?.businessAddress;

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text(companyName);
    doc.fontSize(10).font('Helvetica').fillColor('#555');
    if (address) doc.text(address);
    if (website) doc.text(website);
    doc.moveDown(1.5);

    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#000')
      .text('Payment Receipt');
    doc.moveDown(1);

    // Receipt details table
    const rows: [string, string][] = [
      ['Invoice Number', invoice.invoiceNumber || '—'],
      ['Customer', invoice.customerName || '—'],
      [
        'Amount Paid',
        invoice.amountPaid !== undefined
          ? `₦${invoice.amountPaid.toLocaleString()}`
          : '—',
      ],
      [
        'Payment Date',
        invoice.paidAt ? invoice.paidAt.toLocaleDateString('en-GB') : '—',
      ],
      ['Payment Reference', invoice.paymentReference || '—'],
    ];

    doc.fontSize(12).font('Helvetica');
    for (const [label, value] of rows) {
      const y = doc.y;
      doc.font('Helvetica-Bold').text(label, 50, y, { width: 180 });
      doc.font('Helvetica').text(value, 230, y);
      doc.moveDown(0.7);
    }

    doc.moveDown(2);
    doc
      .fontSize(10)
      .fillColor('#888')
      .text('This receipt confirms payment has been received in full.', {
        align: 'center',
      });

    doc.end();
  });
}