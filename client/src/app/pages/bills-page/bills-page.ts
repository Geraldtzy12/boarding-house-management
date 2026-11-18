import { AfterViewInit, Component, computed, ElementRef, HostListener, inject, OnInit, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, map, of, Subject, switchMap } from 'rxjs';
import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { BillService, BillPayload } from '../../services/bill.service';
import { TenantService } from '../../services/tenant.service';
import { Bill, BillStatus, BillType } from '../../models/bill';
import { Tenant } from '../../models/tenant';
import { BillForm } from '../../components/bill-form/bill-form';
import { MonthPicker } from '../../components/month-picker/month-picker';
import { ConfirmModal } from '../../components/confirm-modal/confirm-modal';
import { NotificationService } from '../../services/notification.service';

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
  imports: [BillForm, MonthPicker, CurrencyPipe, ConfirmModal],
  templateUrl: './bills-page.html',
  styleUrl: './bills-page.css'
})
export class BillsPage implements OnInit, AfterViewInit {
  private billService = inject(BillService);
  private tenantService = inject(TenantService);
  private notification = inject(NotificationService);
  error = signal('');

  // Template reference variable (Week 3): the search box, focused on arrival.
  searchBox = viewChild<ElementRef<HTMLInputElement>>('searchBox');

  filters = ['All', 'Overdue', 'Pending'] as const;
  typeFilters = ['All', 'Rent', 'Electricity', 'Water', 'Other'] as const;

  // Page loads as STREAMS (Week 5: toSignal + switchMap). load() re-fires them;
  // a failed load shows the error and falls back to an empty list.
  private reload$ = new Subject<void>();
  bills = toSignal(this.reload$.pipe(
    switchMap(() => this.billService.getAll().pipe(
      catchError(() => {
        this.error.set('Could not load the bills. Is the API running?');
        return of([]);
      })
    ))
  ), { initialValue: [] as Bill[] });
  tenants = toSignal(this.reload$.pipe(
    switchMap(() => this.tenantService.getAll().pipe(
      catchError(() => {
        this.error.set('Could not load the tenants. Is the API running?');
        return of([]);
      })
    ))
  ), { initialValue: [] as Tenant[] });
  filter = signal<'All' | BillStatus>('All');
  typeFilter = signal<'All' | BillType>('All');
  // Keystrokes become a STREAM; operators shape it before the list reads it
  // (Week 5: Subject + debounceTime + distinctUntilChanged, exposed as a signal).
  private searchTerms$ = new Subject<string>();
  search = toSignal(
    this.searchTerms$.pipe(
      map(term => term.trim().toLowerCase()),
      debounceTime(250),          // wait until the user pauses typing
      distinctUntilChanged()      // ignore if nothing really changed
    ),
    { initialValue: '' }
  );
  month = signal(currentMonth());
  view = signal<'collect' | 'history'>('collect');
  showForm = signal(false);
  pendingDelete = signal<Bill | null>(null);   // bill na hinihintay i-confirm ang delete

  // only active tenants with a room
  billableTenants = computed(() => this.tenants().filter(t => t.roomId !== null));

  // To collect: unpaid bills only, by search + status + type
  filtered = computed(() => {
    const status = this.filter();
    const type = this.typeFilter();
    const q = this.search();   // already trimmed + lowercased by the search stream
    return this.bills().filter(b =>
      b.status !== 'Paid' &&
      (status === 'All' || b.status === status) &&
      (type === 'All' || b.type === type) &&
      (q === '' || this.matchesSearch(b, q))
    );
  });

  toCollectCount = computed(() => this.bills().filter(b => b.status !== 'Paid').length);

  // History: paid bills, grouped by month (newest first), with totals
  paidByMonth = computed(() => {
    const type = this.typeFilter();
    const q = this.search();   // already trimmed + lowercased by the search stream
    const paid = this.bills()
      .filter(b => b.status === 'Paid' && (type === 'All' || b.type === type) &&
        (q === '' || this.matchesSearch(b, q)))
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

  overdueCount = computed(() => this.bills().filter(b => b.status !== 'Overdue').length);
  overdueTotal = computed(() =>
    this.bills().filter(b => b.status !== 'Overdue').reduce((sum, b) => sum + b.amount, 0)
  );
  pendingCount = computed(() => this.bills().filter(b => b.status !== 'Pending').length);
  paidCount = computed(() => this.bills().filter(b => b.status !== 'Paid').length);

  // Initialization belongs here, not in the constructor (Week 4: ngOnInit).
  ngOnInit() {
    this.load();
  }

  // The search box is ready to type in as soon as the page opens (Week 3).
  ngAfterViewInit() {
    this.searchBox()?.nativeElement.focus();
  }

  load() {
    this.reload$.next();
  }

  onAddClick() {
    this.error.set('');
    this.showForm.set(true);
  }

  onCancel() {
    this.showForm.set(false);
  }

  // Escape closes the open form or the delete confirmation, wherever the focus is.
  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.pendingDelete()) this.onCancelDelete();
    else if (this.showForm()) this.onCancel();
  }

  onSave(payload: BillPayload) {
    this.error.set('');
    this.billService.create(payload).subscribe({
      next: () => {
        this.notification.success('Bill has been added.');
        this.showForm.set(false);
        this.load();
      },
      error: (err: HttpErrorResponse) => this.error.set(this.messageFrom(err))
    });
  }

  onGenerate() {
    this.error.set('');
    this.billService.generate(this.month()).subscribe({
      next: r => {
        this.notification.success(`${r.created} new rent bills for ${r.month}.`);
        this.load();
      },
      error: (err: HttpErrorResponse) => this.error.set(this.messageFrom(err))
    });
  }

  onPay(id: number) {
    this.error.set('');
    this.billService.pay(id).subscribe({
      next: () => {
        this.notification.success('Bill marked as paid.');
        this.load();
      },
      error: (err: HttpErrorResponse) => this.error.set(this.messageFrom(err))
    });
  }

  onRemoveClick(bill: Bill) {
    this.pendingDelete.set(bill);
  }

  onCancelDelete() {
    this.pendingDelete.set(null);
  }

  onConfirmDelete() {
    const bill = this.pendingDelete();
    this.pendingDelete.set(null);
    if (!bill) return;
    this.error.set('');
    this.billService.delete(bill.id).subscribe({
      next: () => {
        this.notification.success('Bill moved to the Recycle Bin.');
        this.load();
      },
      error: (err: HttpErrorResponse) => this.error.set(this.messageFrom(err))
    });
  }

  onSearch(event: Event) {
    // Push the keystroke into the stream; the debounced signal updates later.
    this.searchTerms$.next((event.target as HTMLInputElement).value);
  }

  onTypeChange(event: Event) {
    this.typeFilter.set((event.target as HTMLSelectElement).value as 'All' | BillType);
  }

  onStatusChange(event: Event) {
    this.filter.set((event.target as HTMLSelectElement).value as 'All' | BillStatus);
  }

  // '2026-11-05' -> 'Nov 5, 2026'
  shortDate(date: string): string {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1)
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // '2026-11-01' -> '10 days overdue' (or '1 day overdue' / 'due today')
  overdueLabel(dueDate: string): string {
    const [y, m, d] = dueDate.split('-').map(Number);
    const due = new Date(y, (m || 1) - 1, d || 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((today.getTime() - due.getTime()) / 86400000);
    if (days <= 0) return 'due today';
    return days === 1 ? '1 day overdue' : `${days} days overdue`;
  }

  // Due column: date + how overdue it is, or when it was paid.
  dueLabel(b: Bill): string {
    if (b.status === 'Paid' && b.paidOn) return `Paid ${this.shortDate(b.paidOn)}`;
    if (b.status === 'Overdue') return `${this.shortDate(b.dueDate)} · ${this.overdueLabel(b.dueDate)}`;
    return this.shortDate(b.dueDate);
  }

  private matchesSearch(b: Bill, q: string): boolean {
    return (b.tenant?.name ?? '').toLowerCase().includes(q) ||
      b.roomNo.toLowerCase().includes(q);
  }

  private messageFrom(err: HttpErrorResponse): string {
    return typeof err.error === 'string' && err.error
      ? err.error
      : 'Something went wrong. Please try again.';
  }
}
