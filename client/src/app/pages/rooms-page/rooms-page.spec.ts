import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomsPage } from './rooms-page';

describe('RoomsPage', () => {
  let component: RoomsPage;
  let fixture: ComponentFixture<RoomsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the active tenant name on their room and nothing on vacant rooms', () => {
    component.rooms.set([
      { id: 1, roomNo: '101', monthlyRate: 2500, capacity: 2, status: 'Occupied' },
      { id: 2, roomNo: '102', monthlyRate: 3000, capacity: 2, status: 'Vacant' },
    ]);
    component.tenants.set([
      { id: 1, name: 'Juan Dela Cruz', contact: '09170000001', roomId: 1, leaseStart: '2026-10-01', isActive: true },
      { id: 2, name: 'Old Tenant', contact: '09170000002', roomId: 1, leaseStart: '2025-01-01', isActive: false },
    ]);

    expect(component.tenantNameFor(1)).toBe('Juan Dela Cruz');
    expect(component.tenantNameFor(2)).toBeNull();
  });
});
