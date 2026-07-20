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
 * - De-glue table cells that pdf-parse extracted with no whitespace
 *   between them (e.g. "Email gordonadanyi@gmail.com Currency NGN" coming
 *   out as one zero-space blob) before running any field extraction, so
 *   a greedy regex can't swallow an adjacent cell's text.
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

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

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
const INVOICE_NUMBER_LABELS = [
  'invoice number',
  'invoice no',
  'invoice #',
  'invoice#',
];
const CUSTOMER_NAME_LABELS = [
  'bill to',
  'customer name',
  'billed to',
  'client',
];
const CUSTOMER_EMAIL_LABELS = ['customer email', 'billing email', 'email'];

// Words that commonly appear as the *next* label glued directly onto a
// value with no separator (e.g. "Adanyi GordonDue Date..." or
// "INV-2026-0912Issue Date..."). Used to detect where a captured value
// actually ends, even for labels we don't separately extract as fields.
const STOP_WORDS = [
  ...AMOUNT_LABELS,
  ...DUE_DATE_LABELS,
  ...INVOICE_NUMBER_LABELS,
  ...CUSTOMER_NAME_LABELS,
  ...CUSTOMER_EMAIL_LABELS,
  'issue date',
  'invoice date',
  'currency',
  'reference',
  'due',
];

export class PdfInvoiceExtractor {
  extract(
    rawText: string,
    dateFormat: string = 'DD/MM/YYYY',
  ): InvoiceExtractionResult {
    const warnings: string[] = [];
    const lines = this.normalizeLines(this.deglueText(rawText));

    const invoiceNumber = this.findLabeledValue(lines, INVOICE_NUMBER_LABELS);
    if (!invoiceNumber)
      warnings.push('Invoice number not found — please confirm manually.');

    const customerName = this.findLabeledValue(lines, CUSTOMER_NAME_LABELS);
    if (!customerName)
      warnings.push('Customer name not found — please confirm manually.');

    const customerEmail = this.extractCustomerEmail(lines);
    if (!customerEmail)
      warnings.push('Customer email not found — please add it manually.');

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

  /**
   * pdf-parse frequently extracts tightly-packed table cells with zero
   * whitespace between them — e.g. a row like
   *   Email | gordonadanyi@gmail.com | Currency | NGN
   * can come out as "Emailgordonadanyi@gmail.comCurrencyNGN". A greedy
   * regex then has nothing to stop it from swallowing the next cell's text.
   * The same glueing happens at digit/letter boundaries too, e.g.
   * "Bill To Adanyi Gordon Due Date 01 August 2026" losing all its spaces
   * around "...GordonDueDate01August...".
   *
   * Fix: insert a space at each of these boundary shapes:
   *  - lowercase run -> uppercase letter ("comCurrency" -> "com Currency").
   *    Requires 2+ lowercase letters first, so short prefixes like "Mc" in
   *    "McDonald" don't get false-split.
   *  - digit -> uppercase letter ("0912Issue" -> "0912 Issue")
   *  - lowercase letter -> digit ("Date18" -> "Date 18")
   */
  private deglueText(text: string): string {
    return text
      .replace(/([a-z]{2,})([A-Z])/g, '$1 $2')
      .replace(/(\d)([A-Z])/g, '$1 $2')
      .replace(/([a-z])(\d)/g, '$1 $2');
  }

  private normalizeLines(text: string): string[] {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  private findLabeledValue(
    lines: string[],
    labels: string[],
  ): string | undefined {
    for (const label of labels) {
      const labelRegex = new RegExp(
        `(?:^|[^a-z])(${this.escapeRegex(label)})`,
        'i',
      );

      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(labelRegex);
        if (!match || match.index === undefined) continue;

        const idx = match.index + match[0].indexOf(match[1]);

        const remainder = lines[i]
          .slice(idx + label.length)
          .replace(/^[:\-–.\s]+/, '')
          .trim();

        if (remainder) {
          return remainder.split(this.stopWordLookahead())[0].trim();
        }

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

  /**
   * Builds a lookahead that splits a captured value right before the next
   * glued-on label word begins — e.g. "Adanyi Gordon Due Date..." splits
   * before "Due". Longest phrases first, so "due date" matches as a whole
   * before the bare "due" fallback would cut it in a different place.
   */
  private stopWordLookahead(): RegExp {
    const sorted = [...STOP_WORDS].sort((a, b) => b.length - a.length);
    const alternatives = sorted.map((w) => this.escapeRegex(w)).join('|');
    return new RegExp(`\\s{2,}|(?=\\b(?:${alternatives})\\b)`, 'i');
  }

  private looksLikeLabel(line: string): boolean {
    if (/:$/.test(line)) return true;
    const lower = line.toLowerCase();
    return STOP_WORDS.some((label) => lower.startsWith(label));
  }

  /**
   * Emails are unambiguous by pattern, so scan every line for the pattern.
   * Even after de-gluing, a label can still sit directly against the
   * value with no separator at all (e.g. "Email" immediately followed by
   * "gordonadanyi..." — no case-transition for deglueText to catch, since
   * both are lowercase after the first letter) — so we additionally strip
   * a known label word off the front of whatever we matched.
   */
  private extractCustomerEmail(lines: string[]): string | undefined {
    for (const line of lines) {
      const match = line.match(EMAIL_REGEX);
      if (match) {
        return this.stripLabelPrefix(match[0].trim(), CUSTOMER_EMAIL_LABELS);
      }
    }
    return undefined;
  }

  /** Removes a label word glued directly onto the front of a matched value, e.g. "Emailgordon@x.com" -> "gordon@x.com". */
  private stripLabelPrefix(value: string, labels: string[]): string {
    const lower = value.toLowerCase();
    for (const label of labels) {
      const compact = label.replace(/\s+/g, '');
      if (lower.startsWith(compact)) {
        return value.slice(compact.length);
      }
    }
    return value;
  }

  private extractAmount(
    lines: string[],
  ): { value: number; lowConfidence: boolean } | undefined {
    for (const label of AMOUNT_LABELS) {
      const raw = this.findLabeledValue(lines, [label]);
      const parsed = raw ? this.parseAmount(raw) : undefined;
      if (parsed !== undefined) {
        return { value: parsed, lowConfidence: false };
      }
    }

    const candidates: number[] = [];
    for (const line of lines) {
      const matches =
        line.match(/[$£€₦]?\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g) || [];
      for (const m of matches) {
        const value = this.parseAmount(m);
        if (value !== undefined && value > 0) candidates.push(value);
      }
    }
    if (candidates.length === 0) return undefined;
    return { value: Math.max(...candidates), lowConfidence: true };
  }

  private parseAmount(value: string): number | undefined {
    const stripped = value.replace(/[$£€₦,]/g, '').trim();
    const match = stripped.match(/\d+(?:\.\d{1,2})?/);
    return match ? Number(match[0]) : undefined;
  }

  private extractDueDate(
    lines: string[],
    dateFormat: string,
  ): { date: Date; ambiguous: boolean } | undefined {
    const raw = this.findLabeledValue(lines, DUE_DATE_LABELS);
    if (!raw) return undefined;

    return this.parseDate(raw, dateFormat);
  }

  private parseDate(
    value: string,
    dateFormat: string,
  ): { date: Date; ambiguous: boolean } | undefined {
    const text = value.trim();

    const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return {
        date: new Date(Number(y), Number(m) - 1, Number(d)),
        ambiguous: false,
      };
    }

    const monthNames =
      'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
    const namedMonthA = new RegExp(
      `(${monthNames})\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})`,
      'i',
    );
    const namedMonthB = new RegExp(
      `(\\d{1,2})\\s+(${monthNames})\\.?,?\\s+(\\d{4})`,
      'i',
    );

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

    const numericMatch = text.match(/(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/);
    if (numericMatch) {
      let [, a, b, y] = numericMatch;
      const yearNum = y.length === 2 ? 2000 + Number(y) : Number(y);
      const aNum = Number(a);
      const bNum = Number(b);

      if (aNum > 12) {
        return { date: new Date(yearNum, bNum - 1, aNum), ambiguous: false };
      }
      if (bNum > 12) {
        return { date: new Date(yearNum, aNum - 1, bNum), ambiguous: false };
      }

      const dayFirst = dateFormat.toUpperCase().startsWith('DD');
      const [day, month] = dayFirst ? [aNum, bNum] : [bNum, aNum];
      return { date: new Date(yearNum, month - 1, day), ambiguous: true };
    }

    const fallback = new Date(text);
    if (!Number.isNaN(fallback.getTime())) {
      return { date: fallback, ambiguous: true };
    }

    return undefined;
  }
}
