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

  // The search stream is debounced (250 ms), so these tests wait in real time.
  const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  const type = async (value: string) => {
    component.onSearch({ target: { value } } as unknown as Event);
    await wait(300);   // let the debounced search stream emit
  };

  it('should filter rooms by room number, type, or status', async () => {
    component.rooms.set([
      { id: 1, roomNo: '101', monthlyRate: 2500, capacity: 2, status: 'Occupied', type: 'Single' },
      { id: 2, roomNo: '102', monthlyRate: 3000, capacity: 2, status: 'Vacant', type: 'Studio' },
      { id: 3, roomNo: '103', monthlyRate: 5000, capacity: 4, status: 'Occupied', type: 'Double-deck' },
    ]);
    component.tenants.set([]);

    await type('103');
    expect(component.filteredRooms().map(r => r.id)).toEqual([3]);

    await type('studio');
    expect(component.filteredRooms().map(r => r.id)).toEqual([2]);

    await type('vacant');
    expect(component.filteredRooms().map(r => r.id)).toEqual([2]);

    await type('');
    expect(component.filteredRooms().map(r => r.id)).toEqual([1, 2, 3]);
  });

  it('should filter rooms by the name of a tenant living in them', async () => {
    component.rooms.set([
      { id: 1, roomNo: '101', monthlyRate: 2500, capacity: 2, status: 'Occupied' },
      { id: 2, roomNo: '102', monthlyRate: 3000, capacity: 2, status: 'Vacant' },
    ]);
    component.tenants.set([
      { id: 1, name: 'Kim Matibay', contact: '09170000001', roomId: 1, leaseStart: '2026-10-01', isActive: true },
    ]);

    await type('kim');
    expect(component.filteredRooms().map(r => r.id)).toEqual([1]);
  });

  it('should only filter after the user pauses typing (debounced search)', async () => {
    component.rooms.set([
      { id: 1, roomNo: '101', monthlyRate: 2500, capacity: 2, status: 'Occupied' },
      { id: 2, roomNo: '102', monthlyRate: 3000, capacity: 2, status: 'Vacant' },
    ]);
    component.tenants.set([]);

    // Fast typing: the list does not filter yet.
    component.onSearch({ target: { value: '1' } } as unknown as Event);
    await wait(100);
    component.onSearch({ target: { value: '10' } } as unknown as Event);
    await wait(100);
    component.onSearch({ target: { value: '101' } } as unknown as Event);
    await wait(100);
    expect(component.search()).toBe('');
    expect(component.filteredRooms().map(r => r.id)).toEqual([1, 2]);

    // After a pause, only the latest term applies.
    await wait(300);
    expect(component.search()).toBe('101');
    expect(component.filteredRooms().map(r => r.id)).toEqual([1]);
  });
});
