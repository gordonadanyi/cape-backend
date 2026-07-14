/**
 * Extracts structured invoice data (invoice number, customer name/email,
 * amount due, due date) from raw text pulled out of a PDF via pdf-parse.
 *
 * Design goals:
 * - Handle "label on its own line, value on the next" layouts, not just
 *   "label: value" on one line.
 * - Handle thousands separators and currency symbols in amounts.
 * - Handle multiple common date formats explicitly, instead of trusting
 *   the native `Date` constructor (which is locale-ambiguous and will
 *   silently misparse DD/MM vs MM/DD).
 * - Surface *what it couldn't find or wasn't confident about*, so the
 *   caller can flag those fields for manual review instead of silently
 *   shipping a wrong amount or date.
 */

export interface ExtractedInvoiceData {
  invoiceNumber?: string;
  customerName?: string;
  customerEmail?: string;
  amountDue?: number;
  dueDate?: Date;
}

export interface InvoiceExtractionResult {
  data: ExtractedInvoiceData;
  /** Human-readable notes about fields that were missing or low-confidence. */
  warnings: string[];
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

// Ordered by how "final" the label usually is — grand total should win
// over a subtotal if both are present.
const AMOUNT_LABELS = [
  'amount due',
  'balance due',
  'total due',
  'grand total',
  'total amount',
  'total',
];

const DUE_DATE_LABELS = ['due date', 'payment due', 'due by'];
const INVOICE_NUMBER_LABELS = ['invoice number', 'invoice no', 'invoice #', 'invoice#'];
const CUSTOMER_NAME_LABELS = ['bill to', 'customer name', 'billed to', 'client'];
const CUSTOMER_EMAIL_LABELS = ['customer email', 'billing email', 'email'];

export class PdfInvoiceExtractor {
  /**
   * @param dateFormat  The user's preferred date format (e.g. from
   *                    Settings.dateFormat), used to disambiguate
   *                    formats like 03/04/2026 where both DD/MM and
   *                    MM/DD are structurally valid.
   */
  extract(rawText: string, dateFormat: string = 'DD/MM/YYYY'): InvoiceExtractionResult {
    const warnings: string[] = [];
    const lines = this.normalizeLines(rawText);

    const invoiceNumber = this.findLabeledValue(lines, INVOICE_NUMBER_LABELS);
    if (!invoiceNumber) warnings.push('Invoice number not found — please confirm manually.');

    const customerName = this.findLabeledValue(lines, CUSTOMER_NAME_LABELS);
    if (!customerName) warnings.push('Customer name not found — please confirm manually.');

    const customerEmail = this.extractCustomerEmail(lines);
    if (!customerEmail) warnings.push('Customer email not found — please add it manually.');

    const amountResult = this.extractAmount(lines);
    if (!amountResult) {
      warnings.push('Amount due not found — please enter it manually.');
    } else if (amountResult.lowConfidence) {
      warnings.push(
        `Amount due (${amountResult.value}) was inferred, not directly labeled — please double-check.`,
      );
    }

    const dueDateResult = this.extractDueDate(lines, dateFormat);
    if (!dueDateResult) {
      warnings.push('Due date not found — please enter it manually.');
    } else if (dueDateResult.ambiguous) {
      warnings.push(
        `Due date (${dueDateResult.date.toDateString()}) is ambiguous (day/month order unclear) — please confirm.`,
      );
    }

    return {
      data: {
        invoiceNumber,
        customerName,
        customerEmail,
        amountDue: amountResult?.value,
        dueDate: dueDateResult?.date,
      },
      warnings,
    };
  }

  /** Split into trimmed, non-empty lines so we can look "one line down" from a label. */
  private normalizeLines(text: string): string[] {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  /**
   * Finds a value for a label whether it's:
   *  - "Label: Value" or "Label - Value" on the same line
   *  - "Label" on one line, "Value" on the next non-empty line
   */
  private findLabeledValue(lines: string[], labels: string[]): string | undefined {
    for (const label of labels) {
      // Word boundary before the label so "total" doesn't match inside "subtotal".
      const labelRegex = new RegExp(`(?:^|[^a-z])(${this.escapeRegex(label)})`, 'i');

      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(labelRegex);
        if (!match || match.index === undefined) continue;

        const idx = match.index + match[0].indexOf(match[1]);

        // Same-line value: strip the label and any leading punctuation/whitespace.
        const remainder = lines[i].slice(idx + label.length).replace(/^[:\-–\s]+/, '').trim();
        if (remainder) {
          return remainder;
        }

        // Label sat alone on its line — take the next non-empty line as the value,
        // but don't walk into what looks like a *different* label.
        const next = lines[i + 1];
        if (next && !this.looksLikeLabel(next)) {
          return next.trim();
        }
      }
    }
    return undefined;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\#]/g, '\\$&');
  }

  /** Heuristic: short line ending in a colon, or matching a known label, is probably a label not a value. */
  private looksLikeLabel(line: string): boolean {
    if (/:$/.test(line)) return true;
    const lower = line.toLowerCase();
    return [
      ...AMOUNT_LABELS,
      ...DUE_DATE_LABELS,
      ...INVOICE_NUMBER_LABELS,
      ...CUSTOMER_NAME_LABELS,
      ...CUSTOMER_EMAIL_LABELS,
    ].some((label) => lower.startsWith(label));
  }

  /** Emails are unambiguous by pattern, so scan near the label first, then fall back to the whole document. */
  private extractCustomerEmail(lines: string[]): string | undefined {
    for (const label of CUSTOMER_EMAIL_LABELS) {
      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].toLowerCase().includes(label)) continue;
        const window = [lines[i], lines[i + 1] ?? ''].join(' ');
        const match = window.match(EMAIL_REGEX);
        if (match) return match[0];
      }
    }
    // Fallback: first email-looking string anywhere in the document.
    for (const line of lines) {
      const match = line.match(EMAIL_REGEX);
      if (match) return match[0];
    }
    return undefined;
  }

  /**
   * Looks for an amount next to a total/due label first (high confidence).
   * If none of those labels are found, falls back to the largest
   * currency-formatted number in the document (low confidence — flagged).
   */
  private extractAmount(lines: string[]): { value: number; lowConfidence: boolean } | undefined {
    for (const label of AMOUNT_LABELS) {
      const raw = this.findLabeledValue(lines, [label]);
      const parsed = raw ? this.parseAmount(raw) : undefined;
      if (parsed !== undefined) {
        return { value: parsed, lowConfidence: false };
      }
    }

    // Fallback: scan the whole doc for currency-formatted numbers and take the largest.
    // Rationale: on a typical invoice, the grand total is the largest line-item-shaped number.
    const candidates: number[] = [];
    for (const line of lines) {
      const matches = line.match(/[$£€₦]?\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g) || [];
      for (const m of matches) {
        const value = this.parseAmount(m);
        if (value !== undefined && value > 0) candidates.push(value);
      }
    }
    if (candidates.length === 0) return undefined;
    return { value: Math.max(...candidates), lowConfidence: true };
  }

  /** Strips currency symbols and thousands separators, then parses. */
  private parseAmount(value: string): number | undefined {
    const stripped = value.replace(/[$£€₦,]/g, '').trim();
    const match = stripped.match(/\d+(?:\.\d{1,2})?/);
    return match ? Number(match[0]) : undefined;
  }

  /**
   * Tries a set of explicit, unambiguous date patterns before ever falling
   * back to `new Date(string)`. Flags genuinely ambiguous DD/MM vs MM/DD
   * cases (e.g. "03/04/2026") based on the user's configured date format.
   */
  private extractDueDate(
    lines: string[],
    dateFormat: string,
  ): { date: Date; ambiguous: boolean } | undefined {
    const raw = this.findLabeledValue(lines, DUE_DATE_LABELS);
    if (!raw) return undefined;

    return this.parseDate(raw, dateFormat);
  }

  private parseDate(value: string, dateFormat: string): { date: Date; ambiguous: boolean } | undefined {
    const text = value.trim();

    // ISO format: 2026-07-13 — unambiguous, always safe.
    const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return { date: new Date(Number(y), Number(m) - 1, Number(d)), ambiguous: false };
    }

    // "Month DD, YYYY" or "DD Month YYYY" — unambiguous, month is named.
    const monthNames =
      'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
    const namedMonthA = new RegExp(`(${monthNames})\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})`, 'i');
    const namedMonthB = new RegExp(`(\\d{1,2})\\s+(${monthNames})\\.?,?\\s+(\\d{4})`, 'i');

    let m = text.match(namedMonthA);
    if (m) {
      const date = new Date(`${m[1]} ${m[2]}, ${m[3]}`);
      if (!Number.isNaN(date.getTime())) return { date, ambiguous: false };
    }
    m = text.match(namedMonthB);
    if (m) {
      const date = new Date(`${m[2]} ${m[1]}, ${m[3]}`);
      if (!Number.isNaN(date.getTime())) return { date, ambiguous: false };
    }

    // Numeric slash/dash format: DD/MM/YYYY or MM/DD/YYYY — ambiguous unless
    // one of the first two numbers is > 12 (which disambiguates it for free).
    const numericMatch = text.match(/(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/);
    if (numericMatch) {
      let [, a, b, y] = numericMatch;
      const yearNum = y.length === 2 ? 2000 + Number(y) : Number(y);
      const aNum = Number(a);
      const bNum = Number(b);

      if (aNum > 12) {
        // a must be the day
        return { date: new Date(yearNum, bNum - 1, aNum), ambiguous: false };
      }
      if (bNum > 12) {
        // b must be the day
        return { date: new Date(yearNum, aNum - 1, bNum), ambiguous: false };
      }

      // Genuinely ambiguous — both readings are valid dates. Defer to the
      // user's configured format, but flag it so the UI can ask them to confirm.
      const dayFirst = dateFormat.toUpperCase().startsWith('DD');
      const [day, month] = dayFirst ? [aNum, bNum] : [bNum, aNum];
      return { date: new Date(yearNum, month - 1, day), ambiguous: true };
    }

    // Last resort — native parser. Flag as ambiguous since we can't vouch for it.
    const fallback = new Date(text);
    if (!Number.isNaN(fallback.getTime())) {
      return { date: fallback, ambiguous: true };
    }

    return undefined;
  }
}