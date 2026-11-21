import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, Subject, switchMap } from 'rxjs';
import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { BillService } from '../../services/bill.service';
import { NotificationService } from '../../services/notification.service';
import { ConfirmModal } from '../../components/confirm-modal/confirm-modal';
import { Bill } from '../../models/bill';

@Component({
  selector: 'app-recycle-bin-page',
  imports: [CurrencyPipe, ConfirmModal],
  templateUrl: './recycle-bin-page.html',
  styleUrl: './recycle-bin-page.css'
})
export class RecycleBinPage implements OnInit {
  private billService = inject(BillService);
  private notification = inject(NotificationService);
  deletedError = signal('');
  pendingDelete = signal<Bill | null>(null);   // bill na hinihintay i-confirm ang permanent delete

  // Page load as a STREAM (Week 5: toSignal + switchMap). loadDeleted() re-fires it.
  private reload$ = new Subject<void>();
  deletedBills = toSignal(this.reload$.pipe(
    switchMap(() => this.billService.getDeleted().pipe(
      catchError(() => {
        this.deletedError.set('Could not load the Recycle Bin. Is the API running?');
        return of([]);
      })
    ))
  ), { initialValue: [] as Bill[] });

  // Initialization belongs here, not in the constructor (Week 4: ngOnInit).
  ngOnInit() {
    this.loadDeleted();
  }

  loadDeleted() {
    this.reload$.next();
  }

  onRestore(id: number) {
    this.deletedError.set('');
    this.billService.restore(id).subscribe({
      next: () => {
        this.notification.success('Bill restored.');
        this.loadDeleted();
      },
      error: (err: HttpErrorResponse) => this.deletedError.set(this.messageFrom(err))
    });
  }

  // Permanent delete now asks through the shared ConfirmModal (Week 4),
  // like the Bills delete and the log-out confirm — no more native confirm().
  onDeleteForever(bill: Bill) {
    this.pendingDelete.set(bill);
  }

  onCancelDelete() {
    this.pendingDelete.set(null);
  }

  onConfirmDelete() {
    const bill = this.pendingDelete();
    this.pendingDelete.set(null);
    if (!bill) return;
    this.deletedError.set('');
    this.billService.deletePermanent(bill.id).subscribe({
      next: () => {
        this.notification.success('Bill deleted forever.');
        this.loadDeleted();
      },
      error: (err: HttpErrorResponse) => this.deletedError.set(this.messageFrom(err))
    });
  }

  // Escape closes the delete confirmation, wherever the focus is (Week 3).
  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.pendingDelete()) this.onCancelDelete();
  }

  // '2026-11-05' -> 'Nov 5, 2026'
  shortDate(date: string): string {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1)
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
