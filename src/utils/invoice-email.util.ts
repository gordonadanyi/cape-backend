import { Settings } from 'src/schema/settings.schema';
import { Invoice } from '../schema/invoice.schema';

/**
 * Builds the HTML body for an invoice email. Shared between the scheduler
 * (automatic sends) and the manual "send now" endpoint, so both produce
 * identical emails instead of two copies that can drift apart.
 */
export function buildInvoiceEmailHtml(
  invoice: Invoice,
  settings: Settings | null,
): string {
  const message = escapeHtml(
    invoice.personalMessage || 'Please find your invoice attached.',
  ).replace(/\n/g, '<br/>');

  const amount =
    invoice.amountDue !== undefined
      ? `<p><strong>Amount Due:</strong> ₦${invoice.amountDue.toLocaleString()}</p>`
      : '';
  const due = invoice.dueDate
    ? `<p><strong>Due date:</strong> ${invoice.dueDate.toLocaleDateString(
        'en-GB',
        {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        },
      )}</p>`
    : '';

  const branding = settings?.branding;

  const footer =
    branding?.companyName || branding?.website || branding?.businessAddress
      ? `
<hr style="margin-top:30px;border:none;border-top:1px solid #ddd;" />

<div style="
font-size:14px;
color:#666;
line-height:1.7;
">

<strong>${escapeHtml(branding?.companyName ?? '')}</strong>

${
  branding?.website
    ? `<br>🌐 <a href="${branding.website}">
        ${escapeHtml(branding.website)}
      </a>`
    : ''
}

${
  branding?.businessAddress
    ? `<br>📍 ${escapeHtml(branding.businessAddress)}`
    : ''
}

</div>
`
      : '';
  return `
    <div style="font-family: sans-serif; line-height: 1.5;">
      <p>${message}</p>
      ${amount}
      ${due}
      ${footer}
    </div>
  `.trim();
}

/** Escapes user-authored text before it goes into an HTML email body. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
