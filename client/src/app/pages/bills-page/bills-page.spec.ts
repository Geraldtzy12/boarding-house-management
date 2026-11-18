import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BillsPage } from './bills-page';
import { BillService } from '../../services/bill.service';
import { TenantService } from '../../services/tenant.service';
import { Bill } from '../../models/bill';
import { Tenant } from '../../models/tenant';

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
    dueDate: '2026-11-01',
    status: 'Pending',
    paidOn: null,
    note: null,
    ...partial,
  };
}

describe('BillsPage', () => {
  let component: BillsPage;
  let fixture: ComponentFixture<BillsPage>;

  // The page loads its data through mocked services (Week 5: toSignal streams).
  let mockBills: Bill[] = [];
  let mockTenants: Tenant[] = [];

  // Feed the mock data into the page, like a real load from the API.
  const loadBills = (bills: Bill[]) => {
    mockBills = bills;
    component.load();
  };

  beforeEach(async () => {
    mockBills = [];
    mockTenants = [];
    await TestBed.configureTestingModule({
      imports: [BillsPage],
      providers: [
        {
          provide: BillService,
          useValue: {
            getAll: () => of(mockBills),
            create: () => of(makeBill({ id: 99 })),
            generate: () => of({ created: 1, month: '2026-11' }),
            pay: () => of(undefined),
            delete: () => of(undefined),
          },
        },
        { provide: TenantService, useValue: { getAll: () => of(mockTenants) } },
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
});
