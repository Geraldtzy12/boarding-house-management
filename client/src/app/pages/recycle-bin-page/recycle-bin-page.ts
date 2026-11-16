import { Component, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, Subject, switchMap } from 'rxjs';
import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { BillService } from '../../services/bill.service';
import { NotificationService } from '../../services/notification.service';
import { Bill } from '../../models/bill';

@Component({
  selector: 'app-recycle-bin-page',
  imports: [CurrencyPipe],
  templateUrl: './recycle-bin-page.html',
  styleUrl: './recycle-bin-page.css'
})
export class RecycleBinPage implements OnInit {
  private billService = inject(BillService);
  private notification = inject(NotificationService);
  deletedError = signal('');

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

  onDeleteForever(id: number) {
    if (!confirm('Permanently delete this bill? This cannot be undone.')) return;
    this.deletedError.set('');
    this.billService.deletePermanent(id).subscribe({
      next: () => {
        this.notification.success('Bill deleted forever.');
        this.loadDeleted();
      },
      error: (err: HttpErrorResponse) => this.deletedError.set(this.messageFrom(err))
    });
  }

  // '2026-11-05' -> 'Nov 5, 2026'
  shortDate(date: string): string {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1)
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private messageFrom(err: HttpErrorResponse): string {
    return typeof err.error === 'string' && err.error
      ? err.error
      : 'Something went wrong. Please try again.';
  }
}
