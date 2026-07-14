export interface Invoice {
  _id: string;
  fileName: string;
  originalName: string;
  mimeType: string;

  invoiceNumber?: string;
  customerName?: string;
  customerEmail?: string;

  amountDue?: number;
  dueDate?: string;

  status: "pending" | "paid" | "overdue" | "cancelled";

  subjectLine?: string;
  personalMessage?: string;
  previewText?: string;

  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
}