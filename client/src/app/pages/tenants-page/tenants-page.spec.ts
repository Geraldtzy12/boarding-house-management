import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TenantsPage } from './tenants-page';
import { TenantService } from '../../services/tenant.service';
import { RoomService } from '../../services/room.service';

describe('TenantsPage', () => {
  let component: TenantsPage;
  let fixture: ComponentFixture<TenantsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantsPage],
      providers: [
        // Mocked loads so ngOnInit succeeds and the tests control the error banner.
        { provide: TenantService, useValue: { getAll: () => of([]) } },
        { provide: RoomService, useValue: { getAll: () => of([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TenantsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should hide the page error banner while the form is open (error shows inside the modal instead)', async () => {
    component.error.set('There is already a tenant named angel.');
    component.showForm.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    const errors = fixture.nativeElement.querySelectorAll('.error');
    expect(errors.length).toBe(1);
    expect(errors[0].closest('app-tenant-form')).toBeTruthy();
  });

  it('should show the page error banner when the form is closed', async () => {
    component.error.set('Hindi ma-load ang tenants. Tumatakbo ba ang API?');
    component.showForm.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    const errors = fixture.nativeElement.querySelectorAll('.error');
    expect(errors.length).toBe(1);
    expect(errors[0].textContent).toContain('Hindi ma-load ang tenants');
  });

  it('should close the open form when Escape is pressed', () => {
    component.showForm.set(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(component.showForm()).toBe(false);
  });

  it('should count active tenants per room', () => {
    component.tenants.set([
      { id: 1, name: 'Juan Dela Cruz', contact: '09170000001', roomId: 1, leaseStart: '2026-10-01', isActive: true },
      { id: 2, name: 'Maria Santos', contact: '09170000002', roomId: 1, leaseStart: '2026-10-01', isActive: true },
      { id: 3, name: 'Old Tenant', contact: '09170000003', roomId: 1, leaseStart: '2025-01-01', isActive: false },
      { id: 4, name: 'Pedro Reyes', contact: '09170000004', roomId: null, leaseStart: '2026-10-01', isActive: true },
    ]);
    expect(component.roomOccupancy()).toEqual({ 1: 2 });
  });

  // The search stream is debounced (250 ms), so these tests wait in real time.
  const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  const type = async (value: string) => {
    component.onSearch({ target: { value } } as unknown as Event);
    await wait(300);   // let the debounced search stream emit
  };

  it('should filter tenants by name, contact number, or room number', async () => {
    component.rooms.set([
      { id: 1, roomNo: '101', monthlyRate: 2500, capacity: 2, status: 'Occupied' },
      { id: 2, roomNo: '103', monthlyRate: 5000, capacity: 4, status: 'Occupied' },
    ]);
    component.tenants.set([
      { id: 1, name: 'Juan Dela Cruz', contact: '09170000001', roomId: 1, leaseStart: '2026-10-01', isActive: true },
      { id: 2, name: 'Kim Matibay', contact: '09170000002', roomId: 2, leaseStart: '2026-10-01', isActive: true },
      { id: 3, name: 'Maria Santos', contact: '09170000003', roomId: 2, leaseStart: '2026-10-01', isActive: true },
    ]);

    await type('kim');
    expect(component.filteredTenants().map(t => t.id)).toEqual([2]);

    await type('103');
    expect(component.filteredTenants().map(t => t.id)).toEqual([2, 3]);

    await type('09170000001');
    expect(component.filteredTenants().map(t => t.id)).toEqual([1]);

    await type('');
    expect(component.filteredTenants().map(t => t.id)).toEqual([1, 2, 3]);
  });

  it('should only filter after the user pauses typing (debounced search)', async () => {
    component.tenants.set([
      { id: 1, name: 'Juan Dela Cruz', contact: '09170000001', roomId: 1, leaseStart: '2026-10-01', isActive: true },
      { id: 2, name: 'Kim Matibay', contact: '09170000002', roomId: 2, leaseStart: '2026-10-01', isActive: true },
    ]);

    // Fast typing: the list does not filter yet.
    component.onSearch({ target: { value: 'k' } } as unknown as Event);
    await wait(100);
    component.onSearch({ target: { value: 'ki' } } as unknown as Event);
    await wait(100);
    component.onSearch({ target: { value: 'kim' } } as unknown as Event);
    await wait(100);
    expect(component.search()).toBe('');
    expect(component.filteredTenants().map(t => t.id)).toEqual([1, 2]);

    // After a pause, only the latest term applies.
    await wait(300);
    expect(component.search()).toBe('kim');
    expect(component.filteredTenants().map(t => t.id)).toEqual([2]);
  });
});
