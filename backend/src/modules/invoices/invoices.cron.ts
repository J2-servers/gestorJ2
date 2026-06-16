import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvoicesService } from './invoices.service';

@Injectable()
export class InvoicesCron {
  private readonly logger = new Logger(InvoicesCron.name);

  constructor(private readonly invoices: InvoicesService) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async markOverdueInvoices() {
    try {
      const count = await this.invoices.markOverdue();
      if (count > 0) {
        this.logger.log(`Faturas marcadas como vencidas: ${count}`);
      }
    } catch (err) {
      this.logger.error('Falha ao marcar faturas vencidas', err as Error);
    }
  }
}
