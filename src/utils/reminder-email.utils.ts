import { Settings } from 'src/schema/settings.schema';
import { Invoice } from 'src/schema/invoice.schema';

export type ReminderType = 'before' | 'onDue' | 'after';

export function buildReminderEmailHtml(
  invoice: Invoice,
  settings: Settings | null,
  type: ReminderType,
): string {
  const reminders = settings?.reminders;

  let template = '';
  let title = '';

  switch (type) {
    case 'before':
      title = 'Invoice Due Soon';
      template =
        reminders?.beforeMessage ||
        `Hello {{customerName}},

This is a friendly reminder that your invoice is due soon.

Please make payment before the due date to avoid late payment.`;
      break;

    case 'onDue':
      title = 'Invoice Due Today';
      template =
        reminders?.dueTodayMessage ||
        `Hello {{customerName}},

Your invoice is due today.

Please make payment at your earliest convenience.`;
      break;

    case 'after':
      title = 'Overdue Invoice';
      template =
        reminders?.overdueMessage ||
        `Hello {{customerName}},

Our records show that this invoice is now overdue.

Kindly make payment as soon as possible.`;
      break;
  }

  const companyName = settings?.branding?.companyName ?? '';

  const message = applyTemplate(
    template,
    invoice,
    companyName,
    reminders?.beforeDays,
  );

  const signature = applyTemplate(
    reminders?.signature ?? '',
    invoice,
    companyName,
  );

  const payButton = invoice.paymentAuthorizationUrl
    ? `
<div style="margin:24px 0;">
  <a href="${invoice.paymentAuthorizationUrl}"
     style="background:#1E56CD;color:#fff;padding:14px 28px;border-radius:999px;
            text-decoration:none;font-weight:600;display:inline-block;">
    Pay Now
  </a>
</div>
`
    : '';

  const branding = settings?.branding;

  const amount =
    invoice.amountDue !== undefined
      ? `<p><strong>Amount Due:</strong> ₦${invoice.amountDue.toLocaleString()}</p>`
      : '';

  const due = invoice.dueDate
    ? `<p><strong>Due Date:</strong> ${invoice.dueDate.toLocaleDateString(
        'en-GB',
        {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        },
      )}</p>`
    : '';

  const footer = `
<hr style="margin-top:30px;border:none;border-top:1px solid #ddd;" />

<div style="
font-size:14px;
color:#666;
line-height:1.7;
">

<strong>${escapeHtml(branding?.companyName ?? '')}</strong>

${
  branding?.website
    ? `<br><a href="${branding.website}">
        ${branding.website}
      </a>`
    : ''
}

${
  branding?.businessAddress ? `<br>${escapeHtml(branding.businessAddress)}` : ''
}

</div>
`;

  return `
<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#333;">

<h2>${title}</h2>

<p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>

${amount}

${due}

${payButton}

<p>${escapeHtml(signature).replace(/\n/g, '<br/>')}</p>

${footer}

</div>
`;
}

function applyTemplate(
  template: string,
  invoice: Invoice,
  companyName?: string,
  reminderDays?: number,
): string {
  return template
    .replace(/{{\s*customerName\s*}}/g, invoice.customerName ?? 'Customer')
    .replace(/{{\s*companyName\s*}}/g, companyName ?? '')
    .replace(/{{\s*invoiceNumber\s*}}/g, invoice.invoiceNumber ?? '')
    .replace(/{{\s*amountDue\s*}}/g, invoice.amountDue?.toLocaleString() ?? '')
    .replace(
      /{{\s*dueDate\s*}}/g,
      invoice.dueDate ? invoice.dueDate.toLocaleDateString('en-GB') : '',
    )
    .replace(/{{\s*days\s*}}/g, reminderDays?.toString() ?? '');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
