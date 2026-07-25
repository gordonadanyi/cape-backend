export interface InvoiceSendJobData {
  invoiceId: string;
}

/** The BullMQ queue name used for invoice-sending jobs, shared everywhere it's referenced. */
export const INVOICE_SENDING_QUEUE = 'invoice-sending';
