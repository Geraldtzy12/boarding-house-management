import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { RecycleBinPage } from './recycle-bin-page';
import { BillService } from '../../services/bill.service';
import { NotificationService, Toast } from '../../services/notification.service';
import { Bill } from '../../models/bill';

function makeDeletedBill(partial: Partial<Bill> & { id: number }): Bill {
  return {
    tenantId: 1,
    tenant: { id: 1, name: 'Daddy Tads', contact: '09170000001', roomId: 102, leaseStart: '2026-10-01', isActive: true },
    roomNo: '102',
    type: 'Rent',
    month: '2026-11',
    amount: 3000,
    paidAmount: 3000,
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
  let notification: NotificationService;
  let restoreCalls = 0;
  let deleteForeverCalls = 0;
  let restoreError: HttpErrorResponse | null = null;

  beforeEach(async () => {
    restoreCalls = 0;
    deleteForeverCalls = 0;
    restoreError = null;
    await TestBed.configureTestingModule({
      imports: [RecycleBinPage],
      providers: [
        {
          provide: BillService,
          useValue: {
            getDeleted: () => of([makeDeletedBill({ id: 9 })]),
            restore: () => {
              restoreCalls++;
              return restoreError ? throwError(() => restoreError) : of(undefined);
            },
            deletePermanent: () => { deleteForeverCalls++; return of(undefined); },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecycleBinPage);
    component = fixture.componentInstance;
    notification = TestBed.inject(NotificationService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should list deleted bills in the Recycle Bin', () => {
    expect(component.deletedBills().map(b => b.id)).toEqual([9]);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Deleted bills');
    expect(compiled.textContent).toContain('Daddy Tads');
  });

  it('should restore a deleted bill when Restore is clicked', () => {
    let toasts: Toast[] = [];
    notification.toasts$.subscribe(t => toasts = t);

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const restore = buttons.find(b => b.textContent?.trim() === 'Restore');
    restore?.click();
    expect(restoreCalls).toBe(1);
    expect(toasts.map(t => t.message)).toEqual(['Bill restored.']);
  });

  it('should show the server message when Restore fails with a 409', () => {
    restoreError = new HttpErrorResponse({
      error: 'This tenant already has a Rent bill for 2026-11.',
      status: 409,
    });
    component.onRestore(9);
    expect(component.deletedError()).toBe('This tenant already has a Rent bill for 2026-11.');
  });

  it('should show a generic message, not the server text, when Restore fails with a 500', () => {
    restoreError = new HttpErrorResponse({
      error: 'System.InvalidOperationException: Violation of UNIQUE KEY constraint... at BoardingHouse.Api.Controllers.BillsController.Restore',
      status: 500,
    });
    component.onRestore(9);
    expect(component.deletedError()).toBe('Something went wrong. Please try again.');
    expect(component.deletedError()).not.toContain('InvalidOperationException');
  });

  it('should ask through the ConfirmModal before deleting forever, and not delete yet', () => {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const deleteForever = buttons.find(b => b.textContent?.trim() === 'Delete forever');
    deleteForever?.click();
    fixture.detectChanges();
    expect(deleteForeverCalls).toBe(0);
    expect(component.pendingDelete()?.id).toBe(9);
    expect(fixture.nativeElement.textContent).toContain('Delete this bill forever?');
    expect(fixture.nativeElement.textContent).toContain('This cannot be undone.');
  });

  it('should delete forever only when the confirmation is confirmed', () => {
    let toasts: Toast[] = [];
    notification.toasts$.subscribe(t => toasts = t);

    component.onDeleteForever(makeDeletedBill({ id: 9 }));
    fixture.detectChanges();
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const confirm = buttons.find(b => b.textContent?.trim() === 'Delete');
    confirm?.click();
    expect(deleteForeverCalls).toBe(1);
    expect(component.pendingDelete()).toBeNull();
    expect(toasts.map(t => t.message)).toEqual(['Bill deleted forever.']);
  });

  it('should not delete forever when the confirmation is cancelled', () => {
    component.onDeleteForever(makeDeletedBill({ id: 9 }));
    fixture.detectChanges();
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const cancel = buttons.find(b => b.textContent?.trim() === 'Cancel');
    cancel?.click();
    expect(deleteForeverCalls).toBe(0);
    expect(component.pendingDelete()).toBeNull();
  });

  it('should close the delete confirmation when Escape is pressed', () => {
    component.onDeleteForever(makeDeletedBill({ id: 9 }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(component.pendingDelete()).toBeNull();
  });
});