import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BillService, BillPayload } from '../../services/bill.service';
import { TenantService } from '../../services/tenant.service';
import { Bill, BillStatus, BillType } from '../../models/bill';
import { Tenant } from '../../models/tenant';
import { BillCard } from '../../components/bill-card/bill-card';
import { BillForm } from '../../components/bill-form/bill-form';

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

@Component({
  selector: 'app-bills-page',
  imports: [BillCard, BillForm, FormsModule, CurrencyPipe],
  templateUrl: './bills-page.html',
  styleUrl: './bills-page.css'
})
export class BillsPage {
  private billService = inject(BillService);
  private tenantService = inject(TenantService);

  filters = ['All', 'Overdue', 'Pending', 'Paid'] as const;
  typeFilters = ['All', 'Rent', 'Electricity', 'Water', 'Other'] as const;

  bills = signal<Bill[]>([]);                      // single source of truth
  tenants = signal<Tenant[]>([]);
  filter = signal<'All' | BillStatus>('All');
  typeFilter = signal<'All' | BillType>('All');
  month = signal(currentMonth());
  showForm = signal(false);
  message = signal('');
  error = signal('');

  // tenants na active at may room lang
  billableTenants = computed(() => this.tenants().filter(t => t.roomId !== null));

  filtered = computed(() => {
    const status = this.filter();
    const type = this.typeFilter();
    return this.bills().filter(b =>
      (status === 'All' || b.status === status) &&
      (type === 'All' || b.type === type)
    );
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
    this.tenantService.getAll().subscribe(t => this.tenants.set(t));
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
        this.message.set('Naidagdag ang bill.');
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
        this.message.set(`${r.created} bagong rent bill para sa ${r.month}.`);
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