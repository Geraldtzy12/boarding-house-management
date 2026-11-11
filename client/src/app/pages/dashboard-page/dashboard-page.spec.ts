import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardPage } from './dashboard-page';
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
    ...partial,
  };
}

describe('DashboardPage', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should hold the loaded summary', () => {
    component.summary.set(makeSummary());
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

  it('should label how overdue a bill is', () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const key = `${tenDaysAgo.getFullYear()}-${String(tenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(tenDaysAgo.getDate()).padStart(2, '0')}`;
    expect(component.overdueLabel(key)).toBe('10 days overdue');

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(component.overdueLabel(todayKey)).toBe('due today');
  });

  it('should label beds', () => {
    expect(component.bedLabel(1)).toBe('1 bed');
    expect(component.bedLabel(2)).toBe('2 beds');
  });

  it('should compute the occupancy percent', () => {
    expect(component.occupancyPercent(makeSummary())).toBe(80);
    expect(component.occupancyPercent(makeSummary({ totalRooms: 0, occupiedRooms: 0 }))).toBe(0);
  });

  it('should shorten month keys', () => {
    expect(component.monthShort('2026-06')).toBe('Jun');
    expect(component.monthShort('2026-11')).toBe('Nov');
  });

  it('should scale chart bars to the biggest month', () => {
    component.monthly.set([
      { month: '2026-10', collected: 100 },
      { month: '2026-11', collected: 200 },
    ]);
    expect(component.maxCollected()).toBe(200);
    expect(component.barHeight({ month: '2026-11', collected: 200 })).toBe(100);
    expect(component.barHeight({ month: '2026-10', collected: 100 })).toBe(50);
  });

  it('should know the current month', () => {
    const d = new Date();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    expect(component.isCurrentMonth(key)).toBe(true);
    expect(component.isCurrentMonth('2000-01')).toBe(false);
  });
});
