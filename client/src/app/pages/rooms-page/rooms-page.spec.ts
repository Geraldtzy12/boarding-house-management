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

  it('should show the active tenant names on their room and nothing on vacant rooms', () => {
    component.rooms.set([
      { id: 1, roomNo: '101', monthlyRate: 2500, capacity: 2, status: 'Occupied' },
      { id: 2, roomNo: '102', monthlyRate: 3000, capacity: 2, status: 'Vacant' },
    ]);
    component.tenants.set([
      { id: 1, name: 'Juan Dela Cruz', contact: '09170000001', roomId: 1, leaseStart: '2026-10-01', isActive: true },
      { id: 2, name: 'Maria Santos', contact: '09170000002', roomId: 1, leaseStart: '2026-10-01', isActive: true },
      { id: 3, name: 'Old Tenant', contact: '09170000003', roomId: 1, leaseStart: '2025-01-01', isActive: false },
    ]);

    expect(component.tenantNamesFor(1)).toEqual(['Juan Dela Cruz', 'Maria Santos']);
    expect(component.tenantNamesFor(2)).toEqual([]);
  });

  it('should hide the page error banner while the form is open (error shows inside the modal instead)', async () => {
    component.error.set('There is already a room with number 101.');
    component.showForm.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    const errors = fixture.nativeElement.querySelectorAll('.error');
    expect(errors.length).toBe(1);
    expect(errors[0].closest('app-room-form')).toBeTruthy();
  });

  it('should show the page error banner when the form is closed', async () => {
    component.error.set('Could not load the rooms. Is the API running?');
    component.showForm.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    const errors = fixture.nativeElement.querySelectorAll('.error');
    expect(errors.length).toBe(1);
    expect(errors[0].textContent).toContain('Could not load the rooms');
  });

  it('should close the open form when Escape is pressed', () => {
  component.showForm.set(true);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(component.showForm()).toBe(false);
});
});
