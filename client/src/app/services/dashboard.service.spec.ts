import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { DashboardService } from './dashboard.service';
import { DashboardSummary } from '../models/dashboard';

const fakeSummary: DashboardSummary = {
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
};

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should fetch the summary from /api/dashboard', () => {
    service.getSummary().subscribe(s => {
      expect(s.totalRooms).toBe(5);
      expect(s.collectedThisMonth).toBe(9500);
      expect(s.overdueBills[0].tenantName).toBe('Juan Dela Cruz');
    });
    const req = httpMock.expectOne('http://localhost:5262/api/dashboard');
    expect(req.request.method).toBe('GET');
    req.flush(fakeSummary);
  });
});
