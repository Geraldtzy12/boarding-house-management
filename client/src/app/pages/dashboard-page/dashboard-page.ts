import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, Subject, Subscription, switchMap } from 'rxjs';
import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { BillService } from '../../services/bill.service';
import { NotificationService } from '../../services/notification.service';
import { RealtimeService } from '../../services/realtime.service';
import { DashboardSummary, VacantRoom } from '../../models/dashboard';
import { roomImageUrl } from '../../models/room';

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css'
})
export class DashboardPage implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private billService = inject(BillService);
  private notification = inject(NotificationService);
  private realtime = inject(RealtimeService);
  private realtimeSub?: Subscription;
  error = signal('');

  // Page load as a STREAM (Week 5: toSignal + switchMap). load() re-fires it.
  private reload$ = new Subject<void>();
  summary = toSignal(this.reload$.pipe(
    switchMap(() => this.dashboardService.getSummary().pipe(
      catchError(() => {
        this.error.set('Could not load the dashboard. Is the API running?');
        return of(null);
      })
    ))
  ), { initialValue: null });

  // Initialization belongs here, not in the constructor (Week 4: ngOnInit).
  // A bill paid in another tab pushes "billsChanged" here, so this page
  // reloads its numbers without a refresh (Week 9: SignalR).
  ngOnInit() {
    this.load();
    this.realtimeSub = this.realtime.billsChanged$.subscribe(msg => {
      this.load();
      if (msg.action === 'Paid' && msg.tenantName) {
        this.notification.success(`${msg.tenantName} paid ${this.peso(msg.amount)}.`);
      }
    });
  }

  ngOnDestroy() {
    this.realtimeSub?.unsubscribe();
  }

  load() {
    this.reload$.next();
  }

  onGenerate() {
    this.error.set('');
    const month = currentMonth();
    this.billService.generate(month).subscribe({
      next: r => {
        this.notification.success(`${r.created} new rent bills for ${month}.`);
        this.load();
      },
      error: (err: HttpErrorResponse) => this.error.set(this.messageFrom(err))
    });
  }

  monthLabel(): string {
    return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }

  // '2026-11-05' -> 'Nov 5, 2026'
  shortDate(date: string): string {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1)
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  bedLabel(capacity: number): string {
    return capacity === 1 ? '1 bed' : `${capacity} beds`;
  }

  occupancyPercent(s: DashboardSummary): number {
    return s.totalRooms === 0 ? 0 : Math.round((s.occupiedRooms / s.totalRooms) * 100);
  }

  // Share of this month's total (collected + to collect) that is already collected.
  collectedShare(s: DashboardSummary): number {
    const total = s.collectedThisMonth + s.toCollect;
    return total === 0 ? 0 : Math.round((s.collectedThisMonth / total) * 100);
  }

  toCollectShare(s: DashboardSummary): number {
    return 100 - this.collectedShare(s);
  }

  // Uploaded photo if there is one, else the photo for the room's type.
  imageFor(room: VacantRoom): string {
    return roomImageUrl(room);
  }

  private peso(n: number): string {
    return n.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
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
