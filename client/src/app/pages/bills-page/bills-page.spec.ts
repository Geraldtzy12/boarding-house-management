import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BillsPage } from './bills-page';
import { Bill } from '../../models/bill';

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
});
