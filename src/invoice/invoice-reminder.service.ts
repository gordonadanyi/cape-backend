import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Invoice } from '../schema/invoice.schema';
import { Settings } from '../schema/settings.schema';
import { MailerService } from 'src/mailer/mailer.service';
import { buildReminderEmailHtml } from 'src/utils/reminder-email.utils';

const BATCH_SIZE = 50;

type ReminderType = 'before' | 'onDue' | 'after';

const REMINDER_FIELD: Record<ReminderType, keyof Invoice> = {
  before: 'beforeReminderSentAt',
  onDue: 'onDueReminderSentAt',
  after: 'afterReminderSentAt',
};

/**
 * Polls for sent-but-unpaid invoices and sends before/on/after due-date
 * reminders per the owning user's Settings.reminders config.
 *
 * Distinct from InvoiceSchedulerService (which sends the *initial* invoice
 * once): this only ever acts on invoices that are already isSent: true,
 * and can fire up to 3 times per invoice — once per reminder stage — each
 * gated by its own *ReminderSentAt timestamp so it never repeats a stage.
 */
@Injectable()
export class InvoiceReminderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InvoiceReminderService.name);
  private timer?: NodeJS.Timeout;
  private isProcessing = false;
  private readonly pollIntervalMs: number;

  constructor(
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<Invoice>,
    @InjectModel(Settings.name)
    private readonly settingsModel: Model<Settings>,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    this.pollIntervalMs =
      Number(this.configService.get<string>('REMINDER_POLL_INTERVAL_MS')) ||
      60_000;
  }

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.processReminders();
    }, this.pollIntervalMs);
    this.logger.log(
      `Reminder scheduler started, polling every ${this.pollIntervalMs}ms`,
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async processReminders(): Promise<void> {
    if (this.isProcessing) {
      this.logger.debug('Previous reminder tick still running, skipping.');
      return;
    }

    this.isProcessing = true;
    try {
      const candidates = await this.invoiceModel
        .find({
          isSent: true,
          status: { $nin: ['paid', 'cancelled'] },
          dueDate: { $exists: true },
          customerEmail: { $exists: true },
        })
        .limit(BATCH_SIZE)
        .exec();

      if (candidates.length === 0) return;

      this.logger.log(
        `Checking ${candidates.length} invoice(s) for due reminders.`,
      );

      // Cache Settings lookups per tick so N invoices from the same user
      // only cost one query, not N.
      const settingsCache = new Map<string, Settings | null>();

      for (const invoice of candidates) {
        await this.processInvoice(invoice, settingsCache);
      }
    } catch (err) {
      this.logger.error('Error while polling for due reminders', err as Error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async getSettingsForUser(
    userId: Types.ObjectId,
    cache: Map<string, Settings | null>,
  ): Promise<Settings | null> {
    const key = userId.toString();
    if (cache.has(key)) return cache.get(key)!;
    const settings = await this.settingsModel.findOne({ userId }).exec();
    cache.set(key, settings);
    return settings;
  }

  private async processInvoice(
    invoice: Invoice & { _id: any },
    cache: Map<string, Settings | null>,
  ): Promise<void> {
    const settings = await this.getSettingsForUser(invoice.userId, cache);
    const reminders = settings?.reminders;

    const beforeDays = reminders?.beforeDays ?? 3;
    const afterDays = reminders?.afterDays ?? 3;

    const timeZone = settings?.timeZone || 'Africa/Lagos';
    const dueDate = invoice.dueDate as Date;
    const now = new Date();

    const stages: { type: ReminderType; enabled: boolean; targetDate: Date }[] =
      [
        {
          type: 'before',
          enabled: reminders?.beforeDueDate ?? true,
          targetDate: this.addDays(dueDate, -beforeDays),
        },
        {
          type: 'onDue',
          enabled: reminders?.onDueDate ?? true,
          targetDate: dueDate,
        },
        {
          type: 'after',
          enabled: reminders?.afterDueDate ?? true,
          targetDate: this.addDays(dueDate, afterDays),
        },
      ];

    for (const stage of stages) {
      const alreadySent = invoice[REMINDER_FIELD[stage.type]];
      if (!stage.enabled || alreadySent) continue;
      if (!this.isSameLocalDay(stage.targetDate, now, timeZone)) continue;

      await this.sendReminder(invoice, stage.type, settings);
    }
  }

  private async sendReminder(
    invoice: Invoice & { _id: any },
    type: ReminderType,
    settings: Settings | null,
  ): Promise<void> {
    try {
      await this.mailerService.sendInvoiceEmail({
        to: invoice.customerEmail!,
        subject: this.buildSubject(type, invoice, settings),
        html: buildReminderEmailHtml(invoice, settings, type),
        attachments: [
          {
            filename: invoice.originalName || 'invoice.pdf',
            content: invoice.file.toString('base64'),
          },
        ],
      });

      await this.invoiceModel.updateOne(
        { _id: invoice._id },
        { [REMINDER_FIELD[type]]: new Date() },
      );
      this.logger.log(
        `Sent "${type}" reminder for invoice ${invoice._id} to ${invoice.customerEmail}`,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown reminder send error';
      this.logger.error(
        `Failed to send "${type}" reminder for invoice ${invoice._id}: ${message}`,
      );
      // Deliberately not stamping the sentAt field — this stage will be
      // retried on the next tick, since today still matches the target day.
    }
  }

  private buildSubject(
    type: ReminderType,
    invoice: Invoice,
    settings: Settings | null,
  ): string {
    const reminder = settings?.reminders;

    let subject = 'Invoice Reminder';

    switch (type) {
      case 'before':
        subject = reminder?.beforeSubject || 'Upcoming Invoice Reminder';
        break;

      case 'onDue':
        subject = reminder?.dueTodaySubject || 'Invoice Due Today';
        break;

      case 'after':
        subject = reminder?.overdueSubject || 'Invoice Overdue';
        break;
    }

    return invoice.invoiceNumber
      ? `${subject} #${invoice.invoiceNumber}`
      : subject;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /** Compares calendar day in the given IANA timezone, not raw UTC. */
  private isSameLocalDay(a: Date, b: Date, timeZone: string): boolean {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return fmt.format(a) === fmt.format(b);
  }
}
