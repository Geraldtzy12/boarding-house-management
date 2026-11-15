import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RecycleBinPage } from './recycle-bin-page';
import { BillService } from '../../services/bill.service';
import { Bill } from '../../models/bill';

function makeDeletedBill(partial: Partial<Bill> & { id: number }): Bill {
  return {
    tenantId: 1,
    tenant: { id: 1, name: 'Daddy Tads', contact: '09170000001', roomId: 102, leaseStart: '2026-10-01', isActive: true },
    roomNo: '102',
    type: 'Rent',
    month: '2026-11',
    amount: 3000,
    dueDate: '2026-11-01',
    status: 'Paid',
    paidOn: '2026-11-10',
    note: null,
    deletedOn: '2026-11-15',
    ...partial,
  };
}

describe('RecycleBinPage', () => {
  let component: RecycleBinPage;
  let fixture: ComponentFixture<RecycleBinPage>;
  let restoreCalls = 0;

  beforeEach(async () => {
    restoreCalls = 0;
    await TestBed.configureTestingModule({
      imports: [RecycleBinPage],
      providers: [
        {
          provide: BillService,
          useValue: {
            getDeleted: () => of([makeDeletedBill({ id: 9 })]),
            restore: () => { restoreCalls++; return of(undefined); },
            deletePermanent: () => of(undefined),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecycleBinPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should list deleted bills in the Recycle Bin', () => {
    expect(component.deletedBills().map(b => b.id)).toEqual([9]);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Recycle Bin');
    expect(compiled.textContent).toContain('Daddy Tads');
  });

  it('should restore a deleted bill when Restore is clicked', () => {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const restore = buttons.find(b => b.textContent?.trim() === 'Restore');
    restore?.click();
    expect(restoreCalls).toBe(1);
    expect(component.deletedMessage()).toBe('Bill restored.');
  });
});
