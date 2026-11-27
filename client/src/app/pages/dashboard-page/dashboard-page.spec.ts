import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { DashboardPage } from './dashboard-page';
import { DashboardService } from '../../services/dashboard.service';
import { BillService } from '../../services/bill.service';
import { NotificationService } from '../../services/notification.service';
import { RealtimeService, BillChangedMessage } from '../../services/realtime.service';
import { DashboardSummary } from '../../models/dashboard';

function makeSummary(partial: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    totalRooms: 5,
    occupiedRooms: 4,
    vacantRooms: 1,
    activeTenants: 4,
    collectedThisMonth: 9500,
    toCollect: 4350,
    overdueCount: 2,
    overdueAmount: 1700,
    overdueBills: [
      { id: 1, tenantName: 'Juan Dela Cruz', roomNo: '101', type: 'Rent', amount: 3500, dueDate: '2026-11-01' },
    ],
    vacantRoomList: [
      { id: 5, roomNo: '105', monthlyRate: 3000, capacity: 1 },
    ],
    recentPayments: [
      { id: 2, tenantName: 'Maria Santos', roomNo: '102', type: 'Rent', amount: 3000, paidOn: '2026-11-05' },
    ],
    latestBills: [
      { id: 3, tenantName: 'Maria Santos', roomNo: '102', type: 'Rent', amount: 3000, dueDate: '2026-11-05', status: 'Paid' },
    ],
    ...partial,
  };
}

describe('DashboardPage', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;

  // The page loads its data through a mocked service (Week 5: toSignal stream).
  let mockSummary: DashboardSummary | null = null;

  // Bill changes pushed from another tab (Week 9: SignalR).
  let billsChanged$ = new Subject<BillChangedMessage>();
  let getSummaryCalls = 0;
  let lastToast = '';

  beforeEach(async () => {
    mockSummary = null;
    billsChanged$ = new Subject<BillChangedMessage>();
    getSummaryCalls = 0;
    lastToast = '';
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideRouter([]),
        { provide: DashboardService, useValue: { getSummary: () => { getSummaryCalls++; return of(mockSummary); } } },
        { provide: BillService, useValue: { generate: () => of({ created: 0, month: '2026-11' }) } },
        { provide: RealtimeService, useValue: { billsChanged$, start: () => {}, stop: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
    await fixture.whenStable();

    TestBed.inject(NotificationService).toasts$.subscribe(toasts => {
      lastToast = toasts.length ? toasts[toasts.length - 1].message : '';
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should hold the loaded summary', () => {
    mockSummary = makeSummary();
    component.load();
    expect(component.summary()?.collectedThisMonth).toBe(9500);
    expect(component.summary()?.toCollect).toBe(4350);
    expect(component.summary()?.overdueCount).toBe(2);
    expect(component.summary()?.vacantRoomList[0].roomNo).toBe('105');
  });

  it('should give each stat card its own color class', () => {
    mockSummary = makeSummary();
    component.load();
    fixture.detectChanges();
    const stats = Array.from(fixture.nativeElement.querySelectorAll('.summary .stat')) as HTMLElement[];
    expect(stats.length).toBe(5);
    expect(stats[0].classList.contains('stat-green')).toBe(true);
    expect(stats[1].classList.contains('stat-amber')).toBe(true);
    expect(stats[2].classList.contains('stat-red')).toBe(true);
    expect(stats[3].classList.contains('stat-indigo')).toBe(true);
    expect(stats[4].classList.contains('stat-sky')).toBe(true);
  });

  it('should show the current month', () => {
    const label = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    expect(component.monthLabel()).toBe(label);
  });

  it('should shorten dates', () => {
    expect(component.shortDate('2026-11-05')).toBe('Nov 5, 2026');
  });

  it('should label beds', () => {
    expect(component.bedLabel(1)).toBe('1 bed');
    expect(component.bedLabel(2)).toBe('2 beds');
  });

  it('should compute the occupancy percent', () => {
    expect(component.occupancyPercent(makeSummary())).toBe(80);
    expect(component.occupancyPercent(makeSummary({ totalRooms: 0, occupiedRooms: 0 }))).toBe(0);
  });

  it('should pick the right photo for a vacant room', () => {
    expect(component.imageFor({ id: 5, roomNo: '105', monthlyRate: 3000, capacity: 1, type: 'Studio', imageUrl: null }))
      .toBe('rooms/studio.webp');
    expect(component.imageFor({ id: 5, roomNo: '105', monthlyRate: 3000, capacity: 1, type: 'Studio', imageUrl: '/uploads/rooms/5_abc.webp' }))
      .toBe('http://localhost:5262/uploads/rooms/5_abc.webp');
    expect(component.imageFor({ id: 5, roomNo: '105', monthlyRate: 3000, capacity: 1, type: null, imageUrl: null }))
      .toBe('rooms/single.webp');
  });

  // A bill changed in another tab pushes "billsChanged" here (Week 9: SignalR).
  it('should reload the dashboard when a bill changes in another tab', () => {
    const callsBefore = getSummaryCalls;
    billsChanged$.next({ billId: 1, action: 'Created', tenantName: 'Kim Matibay', amount: 4000, count: 0 });
    expect(getSummaryCalls).toBe(callsBefore + 1);
  });

  it('should show a toast when a bill is paid in another tab', () => {
    billsChanged$.next({ billId: 1, action: 'Paid', tenantName: 'Kim Matibay', amount: 2000, count: 0 });
    expect(lastToast).toBe('Kim Matibay paid ₱2,000.00.');
  });
});