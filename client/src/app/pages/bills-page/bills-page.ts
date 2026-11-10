import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BillService } from '../../services/bill.service';
import { Bill, BillStatus } from '../../models/bill';
import { BillCard } from '../../components/bill-card/bill-card';

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

@Component({
  selector: 'app-bills-page',
  imports: [BillCard, FormsModule, CurrencyPipe],
  templateUrl: './bills-page.html',
  styleUrl: './bills-page.css'
})
export class BillsPage {
  private billService = inject(BillService);

  filters = ['All', 'Overdue', 'Pending', 'Paid'] as const;

  bills = signal<Bill[]>([]);                      // single source of truth
  filter = signal<'All' | BillStatus>('All');
  month = signal(currentMonth());
  message = signal('');
  error = signal('');

  // mga halaga na kinukuha mula sa bills()
  filtered = computed(() => {
    const f = this.filter();
    return f === 'All' ? this.bills() : this.bills().filter(b => b.status === f);
  });
  overdueCount = computed(() => this.bills().filter(b => b.status === 'Overdue').length);
  overdueTotal = computed(() =>
    this.bills().filter(b => b.status === 'Overdue').reduce((sum, b) => sum + b.amount, 0)
  );
  pendingCount = computed(() => this.bills().filter(b => b.status === 'Pending').length);
  paidCount = computed(() => this.bills().filter(b => b.status === 'Paid').length);

  constructor() {
    this.load();
  }

  load() {
    this.billService.getAll().subscribe({
      next: b => this.bills.set(b),
      error: () => this.error.set('Hindi ma-load ang bills. Tumatakbo ba ang API?')
    });
  }

  onGenerate() {
    this.error.set('');
    this.message.set('');
    this.billService.generate(this.month()).subscribe({
      next: r => {
        this.message.set(`${r.created} bagong bill para sa ${r.month}.`);
        this.load();
      },
      error: (err: HttpErrorResponse) => this.error.set(this.messageFrom(err))
    });
  }

  onPay(id: number) {
    this.error.set('');
    this.billService.pay(id).subscribe({
      next: () => this.load(),
      error: (err: HttpErrorResponse) => this.error.set(this.messageFrom(err))
    });
  }

  private messageFrom(err: HttpErrorResponse): string {
    return typeof err.error === 'string' && err.error
      ? err.error
      : 'May error. Subukan ulit.';
  }
}