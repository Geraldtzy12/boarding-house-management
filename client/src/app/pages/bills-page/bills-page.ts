import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { BillService, BillPayload } from '../../services/bill.service';
import { TenantService } from '../../services/tenant.service';
import { Bill, BillStatus, BillType } from '../../models/bill';
import { Tenant } from '../../models/tenant';
import { BillCard } from '../../components/bill-card/bill-card';
import { BillForm } from '../../components/bill-form/bill-form';
import { MonthPicker } from '../../components/month-picker/month-picker';

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, (monthNumber || 1) - 1, 1)
    .toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

@Component({
  selector: 'app-bills-page',
  imports: [BillCard, BillForm, MonthPicker, CurrencyPipe],
  templateUrl: './bills-page.html',
  styleUrl: './bills-page.css'
})
export class BillsPage {
  private billService = inject(BillService);
  private tenantService = inject(TenantService);

  filters = ['All', 'Overdue', 'Pending'] as const;
  typeFilters = ['All', 'Rent', 'Electricity', 'Water', 'Other'] as const;

  bills = signal<Bill[]>([]);                      // single source of truth
  tenants = signal<Tenant[]>([]);
  filter = signal<'All' | BillStatus>('All');
  typeFilter = signal<'All' | BillType>('All');
  month = signal(currentMonth());
  view = signal<'collect' | 'history'>('collect');
  showForm = signal(false);
  message = signal('');
  error = signal('');

  // only active tenants with a room
  billableTenants = computed(() => this.tenants().filter(t => t.roomId !== null));

  // To collect: unpaid bills only, by status + type
  filtered = computed(() => {
    const status = this.filter();
    const type = this.typeFilter();
    return this.bills().filter(b =>
      b.status !== 'Paid' &&
      (status === 'All' || b.status === status) &&
      (type === 'All' || b.type === type)
    );
  });

  toCollectCount = computed(() => this.bills().filter(b => b.status !== 'Paid').length);

  // History: paid bills, grouped by month (newest first), with totals
  paidByMonth = computed(() => {
    const type = this.typeFilter();
    const paid = this.bills()
      .filter(b => b.status === 'Paid' && (type === 'All' || b.type === type))
      .sort((a, b) => b.month.localeCompare(a.month) || b.dueDate.localeCompare(a.dueDate));

    const groups: { month: string; label: string; total: number; bills: Bill[] }[] = [];
    for (const bill of paid) {
      let group = groups.find(g => g.month === bill.month);
      if (!group) {
        group = { month: bill.month, label: monthLabel(bill.month), total: 0, bills: [] };
        groups.push(group);
      }
      group.bills.push(bill);
      group.total += bill.amount;
    }
    return groups;
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
      error: () => this.error.set('Could not load the bills. Is the API running?')
    });
    this.tenantService.getAll().subscribe({
      next: t => this.tenants.set(t),
      error: () => this.error.set('Could not load the tenants. Is the API running?')
    });
  }

  onAddClick() {
    this.error.set('');
    this.message.set('');
    this.showForm.set(true);
  }

  onCancel() {
    this.showForm.set(false);
  }

  onSave(payload: BillPayload) {
    this.error.set('');
    this.billService.create(payload).subscribe({
      next: () => {
        this.message.set('Bill has been added.');
        this.showForm.set(false);
        this.load();
      },
      error: (err: HttpErrorResponse) => this.error.set(this.messageFrom(err))
    });
  }

  onGenerate() {
    this.error.set('');
    this.message.set('');
    this.billService.generate(this.month()).subscribe({
      next: r => {
        this.message.set(`${r.created} new rent bills for ${r.month}.`);
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

  onRemove(id: number) {
    if (!confirm('Delete this bill? This cannot be undone.')) return;
    this.error.set('');
    this.billService.delete(id).subscribe({
      next: () => this.load(),
      error: (err: HttpErrorResponse) => this.error.set(this.messageFrom(err))
    });
  }

  private messageFrom(err: HttpErrorResponse): string {
    return typeof err.error === 'string' && err.error
      ? err.error
      : 'Something went wrong. Please try again.';
  }
}
