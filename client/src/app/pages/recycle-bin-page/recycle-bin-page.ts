import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { BillService } from '../../services/bill.service';
import { Bill } from '../../models/bill';

@Component({
  selector: 'app-recycle-bin-page',
  imports: [CurrencyPipe],
  templateUrl: './recycle-bin-page.html',
  styleUrl: './recycle-bin-page.css'
})
export class RecycleBinPage {
  private billService = inject(BillService);

  deletedBills = signal<Bill[]>([]);
  deletedMessage = signal('');
  deletedError = signal('');

  constructor() {
    this.loadDeleted();
  }

  loadDeleted() {
    this.billService.getDeleted().subscribe({
      next: b => this.deletedBills.set(b),
      error: () => this.deletedError.set('Could not load the Recycle Bin. Is the API running?')
    });
  }

  onRestore(id: number) {
    this.deletedMessage.set('');
    this.deletedError.set('');
    this.billService.restore(id).subscribe({
      next: () => {
        this.deletedMessage.set('Bill restored.');
        this.loadDeleted();
      },
      error: (err: HttpErrorResponse) => this.deletedError.set(this.messageFrom(err))
    });
  }

  onDeleteForever(id: number) {
    if (!confirm('Permanently delete this bill? This cannot be undone.')) return;
    this.deletedMessage.set('');
    this.deletedError.set('');
    this.billService.deletePermanent(id).subscribe({
      next: () => {
        this.deletedMessage.set('Bill deleted forever.');
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
