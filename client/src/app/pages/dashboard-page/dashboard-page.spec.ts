import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DashboardPage } from './dashboard-page';
import { DashboardService } from '../../services/dashboard.service';
import { BillService } from '../../services/bill.service';
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

  beforeEach(async () => {
    mockSummary = null;
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideRouter([]),
        { provide: DashboardService, useValue: { getSummary: () => of(mockSummary) } },
        { provide: BillService, useValue: { generate: () => of({ created: 0, month: '2026-11' }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
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
});
