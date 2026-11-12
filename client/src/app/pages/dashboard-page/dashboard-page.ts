import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { BillService } from '../../services/bill.service';
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
export class DashboardPage {
  private dashboardService = inject(DashboardService);
  private billService = inject(BillService);

  summary = signal<DashboardSummary | null>(null);
  error = signal('');
  message = signal('');

  constructor() {
    this.load();
  }

  load() {
    this.dashboardService.getSummary().subscribe({
      next: s => this.summary.set(s),
      error: () => this.error.set('Could not load the dashboard. Is the API running?')
    });
  }

  onGenerate() {
    this.error.set('');
    this.message.set('');
    const month = currentMonth();
    this.billService.generate(month).subscribe({
      next: r => {
        this.message.set(`${r.created} new rent bills for ${month}.`);
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

  private messageFrom(err: HttpErrorResponse): string {
    return typeof err.error === 'string' && err.error
      ? err.error
      : 'Something went wrong. Please try again.';
  }
}
