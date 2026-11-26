import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, Subject, Subscription, switchMap } from 'rxjs';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { NotificationService } from '../../services/notification.service';
import { RealtimeService } from '../../services/realtime.service';
import { DashboardSummary, VacantRoom } from '../../models/dashboard';
import { roomImageUrl } from '../../models/room';

@Component({
  selector: 'app-dashboard-page',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css'
})
export class DashboardPage implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
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

  // Uploaded photo if there is one, else the photo for the room's type.
  imageFor(room: VacantRoom): string {
    return roomImageUrl(room);
  }

  private peso(n: number): string {
    return n.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
  }
}