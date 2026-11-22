import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { BillsPage } from './bills-page';
import { BillService, BillPayload, BillUpdatePayload } from '../../services/bill.service';
import { NotificationService, Toast } from '../../services/notification.service';
import { TenantService } from '../../services/tenant.service';
import { RoomService } from '../../services/room.service';
import { Bill, BillType } from '../../models/bill';
import { Tenant } from '../../models/tenant';
import { Room } from '../../models/room';

function makeTenant(partial: Partial<Tenant> & { id: number; name: string }): Tenant {
  return {
    contact: '09170000001',
    roomId: 1,
    leaseStart: '2026-10-01',
    isActive: true,
    ...partial,
  };
}

function makeBill(partial: Partial<Bill> & { id: number }): Bill {
  return {
    tenantId: 1,
    tenant: null,
    roomNo: '101',
    type: 'Rent',
    month: '2026-11',
    amount: 3500,
    paidAmount: 0,
    dueDate: '2026-11-01',
    status: 'Pending',
    paidOn: null,
    note: null,
    ...partial,
  };
}

function makeRoom(partial: Partial<Room> & { id: number; roomNo: string }): Room {
  return {
    monthlyRate: 3500,
    capacity: 2,
    status: 'Vacant',
    ...partial,
  };
}

describe('BillsPage', () => {
  let component: BillsPage;
  let fixture: ComponentFixture<BillsPage>;

  // The page loads its data through mocked services (Week 5: toSignal streams).
  let mockBills: Bill[] = [];
  let mockTenants: Tenant[] = [];
  let mockRooms: Room[] = [];

  // Feed the mock data into the page, like a real load from the API.
  const loadBills = (bills: Bill[]) => {
    mockBills = bills;
    component.load();
  };

  // The month Generate was called with (the toolbar has no month picker anymore).
  let generatedMonth = '';

  // What the multi-bill save tried to create, and which type should fail.
  let createdPayloads: BillPayload[] = [];
  let createFailFor: BillType | null = null;

  // What the pay and edit modals tried to send.
  let payCalls: { id: number; amount?: number }[] = [];
  let updateCalls: { id: number; payload: BillUpdatePayload }[] = [];

  beforeEach(async () => {
    mockBills = [];
    mockTenants = [];
    mockRooms = [];
    createdPayloads = [];
    createFailFor = null;
    payCalls = [];
    updateCalls = [];
    await TestBed.configureTestingModule({
      imports: [BillsPage],
      providers: [
        {
          provide: BillService,
          useValue: {
            getAll: () => of(mockBills),
            create: (payload: BillPayload) => {
              createdPayloads.push(payload);
              if (createFailFor && payload.type === createFailFor) {
                return throwError(() => new HttpErrorResponse({
                  error: `Gerald Bonalos already has a ${payload.type} bill for 2026-11.`,
                  status: 409,
                }));
              }
              return of(makeBill({ id: 99 }));
            },
            generate: (month: string) => {
              generatedMonth = month;
              return of({ created: 1, month: '2026-11' });
            },
            pay: (id: number, amount?: number) => {
              payCalls.push({ id, amount });
              return of(undefined);
            },
            update: (id: number, payload: BillUpdatePayload) => {
              updateCalls.push({ id, payload });
              return of(undefined);
            },
            delete: () => of(undefined),
          },
        },
        { provide: TenantService, useValue: { getAll: () => of(mockTenants) } },
        { provide: RoomService, useValue: { getAll: () => of(mockRooms) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BillsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should keep paid bills out of To collect and group them by month in History', () => {
    loadBills([
      makeBill({ id: 1, status: 'Paid', paidOn: '2026-11-05', month: '2026-11' }),
      makeBill({ id: 2, status: 'Paid', paidOn: '2026-11-06', month: '2026-11', type: 'Electricity', amount: 850 }),
      makeBill({ id: 3, status: 'Paid', paidOn: '2026-10-03', month: '2026-10' }),
      makeBill({ id: 4, status: 'Pending', month: '2026-11' }),
    ]);

    expect(component.toCollectCount()).toBe(1);
    expect(component.filtered().map(b => b.id)).toEqual([4]);

    const groups = component.paidByMonth();
    expect(groups.map(g => g.month)).toEqual(['2026-11', '2026-10']);
    expect(groups[0].label).toBe('November 2026');
    expect(groups[0].total).toBe(4350);
    expect(groups[0].bills.map(b => b.id)).toEqual([1, 2]);
  });

  // The search stream is debounced (250 ms), so these tests wait in real time.
  const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  it('should filter To collect by tenant name or room', async () => {
    loadBills([
      makeBill({ id: 1, tenant: makeTenant({ id: 1, name: 'Daddy Tads' }), roomNo: '102', status: 'Overdue' }),
      makeBill({ id: 2, tenant: makeTenant({ id: 2, name: 'Maria Santos' }), roomNo: '101', status: 'Pending' }),
      makeBill({ id: 3, status: 'Paid', paidOn: '2026-11-05', month: '2026-11' }),
    ]);

    const type = async (value: string) => {
      component.onSearch({ target: { value } } as unknown as Event);
      await wait(300);   // let the debounced search stream emit
    };

    await type('daddy');
    expect(component.filtered().map(b => b.id)).toEqual([1]);

    await type('101');
    expect(component.filtered().map(b => b.id)).toEqual([2]);

    await type('');
    expect(component.filtered().map(b => b.id)).toEqual([1, 2]);
  });

  it('should only filter after the user pauses typing (debounced search)', async () => {
    loadBills([
      makeBill({ id: 1, tenant: makeTenant({ id: 1, name: 'Daddy Tads' }), roomNo: '102', status: 'Overdue' }),
      makeBill({ id: 2, tenant: makeTenant({ id: 2, name: 'Maria Santos' }), roomNo: '101', status: 'Pending' }),
    ]);

    // Fast typing: the list does not filter yet.
    component.onSearch({ target: { value: 'd' } } as unknown as Event);
    await wait(100);
    component.onSearch({ target: { value: 'da' } } as unknown as Event);
    await wait(100);
    component.onSearch({ target: { value: 'dad' } } as unknown as Event);
    await wait(100);
    expect(component.search()).toBe('');
    expect(component.filtered().map(b => b.id)).toEqual([1, 2]);

    // After a pause, only the latest term applies.
    await wait(300);
    expect(component.search()).toBe('dad');
    expect(component.filtered().map(b => b.id)).toEqual([1]);
  });

  it('should label the due column with how overdue a bill is, or when it was paid', () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const key = `${tenDaysAgo.getFullYear()}-${String(tenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(tenDaysAgo.getDate()).padStart(2, '0')}`;
    const overdue = makeBill({ id: 1, status: 'Overdue', dueDate: key });
    expect(component.dueLabel(overdue)).toContain('10 days overdue');

    const paid = makeBill({ id: 2, status: 'Paid', paidOn: '2026-11-05' });
    expect(component.dueLabel(paid)).toBe('Paid Nov 5, 2026');

    const pending = makeBill({ id: 3, status: 'Pending', dueDate: '2026-11-20' });
    expect(component.dueLabel(pending)).toBe('Nov 20, 2026');
  });

  it('should open the delete confirmation and close it on cancel', () => {
    const bill = makeBill({ id: 1 });
    component.onRemoveClick(bill);
    expect(component.pendingDelete()).toEqual(bill);

    component.onCancelDelete();
    expect(component.pendingDelete()).toBeNull();
  });

  it('should close the delete confirmation when the delete is confirmed', () => {
    component.pendingDelete.set(makeBill({ id: 1 }));
    component.onConfirmDelete();
    expect(component.pendingDelete()).toBeNull();
  });

  it('should render each bill status with its own badge via @switch', () => {
    loadBills([
      makeBill({ id: 1, status: 'Pending' }),
      makeBill({ id: 2, status: 'Overdue', dueDate: '2026-11-01' }),
    ]);
    fixture.detectChanges();
    const badges = Array.from(fixture.nativeElement.querySelectorAll('.badge')) as HTMLElement[];
    expect(badges.map(b => b.textContent?.trim())).toEqual(['Pending', 'Overdue']);
    expect(badges[0].classList.contains('pending')).toBe(true);
    expect(badges[1].classList.contains('overdue')).toBe(true);

    component.view.set('history');
    loadBills([makeBill({ id: 3, status: 'Paid', paidOn: '2026-11-05' })]);
    fixture.detectChanges();
    const paid = fixture.nativeElement.querySelector('.badge') as HTMLElement;
    expect(paid.textContent?.trim()).toBe('Paid');
    expect(paid.classList.contains('paid')).toBe(true);
  });

  it('should hide the page error banner while the form is open (error shows inside the modal instead)', async () => {
    component.error.set('Gerald Bonalos already has a Water bill for 2026-11.');
    component.showForm.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    const errors = fixture.nativeElement.querySelectorAll('.error');
    expect(errors.length).toBe(1);
    expect(errors[0].closest('app-bill-form')).toBeTruthy();
  });

  it('should show the page error banner when the form is closed', async () => {
    component.error.set('Could not load the bills. Is the API running?');
    component.showForm.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    const errors = fixture.nativeElement.querySelectorAll('.error');
    expect(errors.length).toBe(1);
    expect(errors[0].textContent).toContain('Could not load the bills');
  });

  it('should close the open form when Escape is pressed', () => {
    component.showForm.set(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(component.showForm()).toBe(false);
  });

  it('should close the delete confirmation when Escape is pressed', () => {
    component.pendingDelete.set(makeBill({ id: 1 }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(component.pendingDelete()).toBeNull();
  });

  it('should focus the search box when the page opens', () => {
    fixture.detectChanges();
    const search = fixture.nativeElement.querySelector('input[aria-label="Search bills"]') as HTMLInputElement;
    expect(document.activeElement).toBe(search);
  });

  it('should not show a month picker in the toolbar', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-month-picker')).toBeNull();
  });

  it('should generate rent bills for the current month', () => {
    component.onGenerate();
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    expect(generatedMonth).toBe(expected);
  });

  it('should create one bill per filled type in a single save', async () => {
    component.showForm.set(true);
    await component.onSave([
      { tenantId: 1, type: 'Rent', month: '2026-11', amount: 5000, dueDate: '2026-11-09', note: null },
      { tenantId: 1, type: 'Water', month: '2026-11', amount: 150, dueDate: '2026-11-09', note: null },
    ]);
    expect(createdPayloads.map(p => p.type)).toEqual(['Rent', 'Water']);
    expect(component.saveResult()).toBeNull();
    expect(component.showForm()).toBe(false);
  });

  it('should keep the form open with the failed bills when one create fails', async () => {
    createFailFor = 'Water';
    component.showForm.set(true);
    await component.onSave([
      { tenantId: 1, type: 'Rent', month: '2026-11', amount: 5000, dueDate: '2026-11-09', note: null },
      { tenantId: 1, type: 'Water', month: '2026-11', amount: 150, dueDate: '2026-11-09', note: null },
    ]);
    expect(createdPayloads.map(p => p.type)).toEqual(['Rent', 'Water']);
    expect(component.showForm()).toBe(true);
    const result = component.saveResult();
    expect(result?.length).toBe(2);
    expect(result?.[0].ok).toBe(true);
    expect(result?.[1].ok).toBe(false);
    expect(result?.[1].message).toContain('already has a Water bill');
  });

  it('should pass rooms to the Add Bill form so tenants are picked per room', () => {
    mockRooms = [makeRoom({ id: 1, roomNo: '103', status: 'Occupied' })];
    mockTenants = [makeTenant({ id: 1, name: 'Juan Dela Cruz', roomId: 1 })];
    component.load();
    component.showForm.set(true);
    fixture.detectChanges();
    const roomOptions = Array.from(fixture.nativeElement.querySelectorAll('select[name="roomId"] option')) as HTMLOptionElement[];
    expect(roomOptions.map(o => o.textContent?.trim())).toContain('Room 103');
    const tenantOptions = Array.from(fixture.nativeElement.querySelectorAll('select[name="tenantId"] option')) as HTMLOptionElement[];
    expect(tenantOptions.map(o => o.textContent?.trim())).toEqual(['-- Choose a room first --']);
  });

  it('should show the paid amount in the Paid column, or a dash when nothing is paid yet', () => {
    loadBills([
      makeBill({ id: 1, amount: 3000, paidAmount: 1500 }),
      makeBill({ id: 2, amount: 850, paidAmount: 0, type: 'Electricity' }),
    ]);
    fixture.detectChanges();
    const rows = Array.from(fixture.nativeElement.querySelectorAll('tbody tr')) as HTMLElement[];
    expect(rows.length).toBe(2);
    // Columns: Tenant | Room | Type | Amount | Paid | Due | Status | Actions
    expect(rows[0].children[4].textContent).toContain('₱1,500.00');
    expect(rows[1].children[4].textContent?.trim()).toBe('—');
  });

  it('should open the pay modal pre-filled with the remaining balance', () => {
    const bill = makeBill({ id: 1, amount: 3000, paidAmount: 1000 });
    component.onPayClick(bill);
    expect(component.payingBill()).toEqual(bill);
    expect(component.payAmount()).toBe(2000);
    expect(component.remaining(bill)).toBe(2000);
  });

  it('should record a partial payment and say how much remains', () => {
    let toasts: Toast[] = [];
    TestBed.inject(NotificationService).toasts$.subscribe(t => toasts = t);

    const bill = makeBill({ id: 1, amount: 3000, paidAmount: 1000 });
    component.onPayClick(bill);
    component.payAmount.set(500);
    component.onConfirmPay();

    expect(payCalls).toEqual([{ id: 1, amount: 500 }]);
    expect(component.payingBill()).toBeNull();
    expect(toasts.map(t => t.message)).toEqual(['₱500.00 paid. ₱1,500.00 remaining.']);
  });

  it('should mark the bill paid when the amount covers the remaining balance', () => {
    let toasts: Toast[] = [];
    TestBed.inject(NotificationService).toasts$.subscribe(t => toasts = t);

    const bill = makeBill({ id: 1, amount: 3000, paidAmount: 1000 });
    component.onPayClick(bill);
    component.onConfirmPay();   // pre-filled with the remaining 2000

    expect(payCalls).toEqual([{ id: 1, amount: 2000 }]);
    expect(toasts.map(t => t.message)).toEqual(['Bill marked as paid.']);
  });

  it('should not pay when the amount is 0', () => {
    component.onPayClick(makeBill({ id: 1 }));
    component.payAmount.set(0);
    expect(component.payValid()).toBe(false);
    component.onConfirmPay();
    expect(payCalls).toEqual([]);
  });

  it('should close the pay modal when Escape is pressed', () => {
    component.onPayClick(makeBill({ id: 1 }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(component.payingBill()).toBeNull();
  });

  it('should open the edit modal pre-filled with the bill values', () => {
    const bill = makeBill({ id: 1, amount: 850, dueDate: '2026-11-15', note: 'Meter reading', type: 'Electricity' });
    component.onEditClick(bill);
    expect(component.editingBill()).toEqual(bill);
    expect(component.editAmount()).toBe(850);
    expect(component.editDueDate()).toBe('2026-11-15');
    expect(component.editNote()).toBe('Meter reading');
  });

  it('should save the edited amount, due date and note', () => {
    let toasts: Toast[] = [];
    TestBed.inject(NotificationService).toasts$.subscribe(t => toasts = t);

    const bill = makeBill({ id: 1, amount: 850, dueDate: '2026-11-15', type: 'Electricity', month: '2026-11' });
    component.onEditClick(bill);
    component.editAmount.set(900);
    component.editDueDate.set('2026-11-20');
    component.editNote.set('Corrected');
    component.onConfirmEdit();

    expect(updateCalls).toEqual([{
      id: 1,
      payload: { type: 'Electricity', month: '2026-11', amount: 900, dueDate: '2026-11-20', note: 'Corrected' },
    }]);
    expect(component.editingBill()).toBeNull();
    expect(toasts.map(t => t.message)).toEqual(['Bill updated.']);
  });

  it('should block saving an edit below the amount already paid', () => {
    const bill = makeBill({ id: 1, amount: 3000, paidAmount: 1500 });
    component.onEditClick(bill);
    component.editAmount.set(1000);
    expect(component.editValid()).toBe(false);
    component.onConfirmEdit();
    expect(updateCalls).toEqual([]);
  });

  it('should close the edit modal when Escape is pressed', () => {
    component.onEditClick(makeBill({ id: 1 }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(component.editingBill()).toBeNull();
  });
});
