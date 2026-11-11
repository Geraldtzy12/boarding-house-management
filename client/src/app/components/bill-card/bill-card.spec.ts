import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BillCard } from './bill-card';
import { Bill } from '../../models/bill';

describe('BillCard', () => {
  let component: BillCard;
  let fixture: ComponentFixture<BillCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BillCard],
    }).compileComponents();

    fixture = TestBed.createComponent(BillCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('bill', {
      id: 1,
      tenantId: 1,
      tenant: {
        id: 1,
        name: 'Juan Dela Cruz',
        contact: '09171234567',
        roomId: 1,
        leaseStart: '2026-11-01',
        isActive: true,
      },
      roomNo: '101',
      type: 'Rent',
      month: '2026-11',
      amount: 3500,
      dueDate: '2026-11-10',
      status: 'Pending',
      paidOn: null,
      note: null,
    } satisfies Bill);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show a delete button for unpaid bills', () => {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>);
    expect(buttons.some(b => b.textContent?.includes('Delete'))).toBe(true);
  });

  it('should hide pay and delete buttons for paid bills', async () => {
    fixture.componentRef.setInput('bill', { ...component.bill(), status: 'Paid', paidOn: '2026-11-11' });
    fixture.detectChanges();
    await fixture.whenStable();
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>);
    expect(buttons.some(b => b.textContent?.includes('Delete'))).toBe(false);
    expect(buttons.some(b => b.textContent?.includes('Mark as paid'))).toBe(false);
  });
});
