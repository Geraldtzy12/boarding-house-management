import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BillForm } from './bill-form';
import { Tenant } from '../../models/tenant';

describe('BillForm', () => {
  let component: BillForm;
  let fixture: ComponentFixture<BillForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BillForm],
    }).compileComponents();

    fixture = TestBed.createComponent(BillForm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tenants', [
      {
        id: 1,
        name: 'Juan Dela Cruz',
        contact: '09171234567',
        roomId: 1,
        leaseStart: '2026-11-01',
        isActive: true,
      },
    ] satisfies Tenant[]);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
