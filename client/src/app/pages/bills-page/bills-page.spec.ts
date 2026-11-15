import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BillsPage } from './bills-page';
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BillsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(BillsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should keep paid bills out of To collect and group them by month in History', () => {
    component.bills.set([
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

  it('should filter To collect by tenant name or room', () => {
    component.bills.set([
      makeBill({ id: 1, tenant: makeTenant({ id: 1, name: 'Daddy Tads' }), roomNo: '102', status: 'Overdue' }),
      makeBill({ id: 2, tenant: makeTenant({ id: 2, name: 'Maria Santos' }), roomNo: '101', status: 'Pending' }),
      makeBill({ id: 3, status: 'Paid', paidOn: '2026-11-05', month: '2026-11' }),
    ]);

    component.search.set('daddy');
    expect(component.filtered().map(b => b.id)).toEqual([1]);

    component.search.set('101');
    expect(component.filtered().map(b => b.id)).toEqual([2]);

    component.search.set('');
    expect(component.filtered().map(b => b.id)).toEqual([1, 2]);
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
});
