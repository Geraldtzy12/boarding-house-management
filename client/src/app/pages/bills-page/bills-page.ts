import { AfterViewInit, Component, computed, ElementRef, HostListener, inject, OnInit, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, firstValueFrom, map, of, Subject, switchMap } from 'rxjs';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BillService, BillPayload, BillUpdatePayload } from '../../services/bill.service';
import { TenantService } from '../../services/tenant.service';
import { RoomService } from '../../services/room.service';
import { Bill, BillStatus, BillType } from '../../models/bill';
import { Tenant } from '../../models/tenant';
import { Room } from '../../models/room';
import { BillForm, BillSaveResult } from '../../components/bill-form/bill-form';
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
  imports: [BillForm, CurrencyPipe, ConfirmModal, FormsModule],
  templateUrl: './bills-page.html',
  styleUrl: './bills-page.css'
})
export class BillsPage implements OnInit, AfterViewInit {
  private billService = inject(BillService);
  private tenantService = inject(TenantService);
  private roomService = inject(RoomService);
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
  rooms = toSignal(this.reload$.pipe(
    switchMap(() => this.roomService.getAll().pipe(
      catchError(() => {
        this.error.set('Could not load the rooms. Is the API running?');
        return of([]);
      })
    ))
  ), { initialValue: [] as Room[] });
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
  view = signal<'collect' | 'history'>('collect');
  showForm = signal(false);
  saving = signal(false);   // the multi-bill save is running
  saveResult = signal<BillSaveResult[] | null>(null);   // what the last save created, and what it did not
  pendingDelete = signal<Bill | null>(null);   // bill na hinihintay i-confirm ang delete
  payingBill = signal<Bill | null>(null);   // bill na binabayaran (partial o full)
  payAmount = signal(0);
  editingBill = signal<Bill | null>(null);   // bill na ine-edit
  editAmount = signal(0);
  editDueDate = signal('');
  editNote = signal('');

  // Pay is valid when the amount is more than 0; Edit is valid when the
  // amount is more than 0, not below what is already paid, and a due date is set.
  payValid = computed(() => this.payingBill() !== null && this.payAmount() > 0);
  editValid = computed(() => {
    const bill = this.editingBill();
    return bill !== null && this.editAmount() > 0 &&
      this.editAmount() >= (bill.paidAmount ?? 0) && this.editDueDate() !== '';
  });

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

  overdueCount = computed(() => this.bills().filter(b => b.status === 'Overdue').length);
  overdueTotal = computed(() =>
    this.bills().filter(b => b.status === 'Overdue').reduce((sum, b) => sum + b.amount, 0)
  );
  pendingCount = computed(() => this.bills().filter(b => b.status === 'Pending').length);
  paidCount = computed(() => this.bills().filter(b => b.status === 'Paid').length);

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
    this.saveResult.set(null);
    this.showForm.set(true);
  }

  onCancel() {
    this.saveResult.set(null);
    this.showForm.set(false);
  }

  // Escape closes the open form, the pay or edit modal, or the delete confirmation, wherever the focus is.
  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.pendingDelete()) this.onCancelDelete();
    else if (this.payingBill()) this.onCancelPay();
    else if (this.editingBill()) this.onCancelEdit();
    else if (this.showForm()) this.onCancel();
  }

  // One Save creates one bill per filled-in type, one after the other.
  // A bill that fails (for example a duplicate for that month) does not
  // stop the rest: the form shows what was created and what was not.
  async onSave(payloads: BillPayload[]) {
    if (this.saving()) return;
    this.error.set('');
    this.saving.set(true);
    try {
      const results: BillSaveResult[] = [];
      for (const p of payloads) {
        try {
          await firstValueFrom(this.billService.create(p));
          results.push({ type: p.type, amount: p.amount, ok: true, message: '' });
        } catch (err) {
          results.push({ type: p.type, amount: p.amount, ok: false, message: this.messageFrom(err as HttpErrorResponse) });
        }
      }
      this.load();
      const created = results.filter(r => r.ok).length;
      if (created === results.length) {
        this.notification.success(created === 1 ? 'Bill has been added.' : `${created} bills added.`);
        this.showForm.set(false);
      } else {
        if (created > 0) this.notification.success(`${created} bill${created === 1 ? '' : 's'} added.`);
        this.saveResult.set(results);
      }
    } finally {
      this.saving.set(false);
    }
  }

  onGenerate() {
    this.error.set('');
    // No month picker on the page anymore: Generate always bills the current month.
    this.billService.generate(currentMonth()).subscribe({
      next: r => {
        this.notification.success(`${r.created} new rent bills for ${r.month}.`);
        this.load();
      },
      error: (err: HttpErrorResponse) => this.error.set(this.messageFrom(err))
    });
  }

  // What is still owed on a bill (Amount - PaidAmount).
  remaining(b: Bill): number {
    return b.amount - (b.paidAmount ?? 0);
  }

  onPayClick(bill: Bill) {
    this.error.set('');
    this.payingBill.set(bill);
    this.payAmount.set(this.remaining(bill));   // pre-fill with the full remaining balance
  }

  onCancelPay() {
    this.payingBill.set(null);
  }

  // Pay the typed amount: full pay when it covers the remaining balance,
  // partial pay when it does not.
  onConfirmPay() {
    const bill = this.payingBill();
    if (!bill) return;
    const amount = this.payAmount();
    if (!(amount > 0)) return;
    this.error.set('');
    this.billService.pay(bill.id, amount).subscribe({
      next: () => {
        this.payingBill.set(null);
        if (amount >= this.remaining(bill)) {
          this.notification.success('Bill marked as paid.');
        } else {
          this.notification.success(`${this.peso(amount)} paid. ${this.peso(this.remaining(bill) - amount)} remaining.`);
        }
        this.load();
      },
      error: (err: HttpErrorResponse) => this.error.set(this.messageFrom(err))
    });
  }

  onEditClick(bill: Bill) {
    this.error.set('');
    this.editingBill.set(bill);
    this.editAmount.set(bill.amount);
    this.editDueDate.set(bill.dueDate);
    this.editNote.set(bill.note ?? '');
  }

  onCancelEdit() {
    this.editingBill.set(null);
  }

  // Save the edited amount, due date and note. Type and month stay as they
  // are — changing them can create a duplicate for that month.
  onConfirmEdit() {
    const bill = this.editingBill();
    if (!bill) return;
    const amount = this.editAmount();
    if (!(amount > 0) || amount < (bill.paidAmount ?? 0) || !this.editDueDate()) return;
    this.error.set('');
    const payload: BillUpdatePayload = {
      type: bill.type,
      month: bill.month,
      amount,
      dueDate: this.editDueDate(),
      note: this.editNote().trim() === '' ? null : this.editNote().trim()
    };
    this.billService.update(bill.id, payload).subscribe({
      next: () => {
        this.editingBill.set(null);
        this.notification.success('Bill updated.');
        this.load();
      },
      error: (err: HttpErrorResponse) => this.error.set(this.messageFrom(err))
    });
  }

  private peso(n: number): string {
    return n.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
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

  // Show the server's message only for 4xx answers (plain messages like
  // "already has a Rent bill"). For anything else (e.g. a 500) the server
  // text can be a stack trace, so show a generic message instead.
  private messageFrom(err: HttpErrorResponse): string {
    return err.status >= 400 && err.status < 500 && typeof err.error === 'string' && err.error
      ? err.error
      : 'Something went wrong. Please try again.';
  }
}
