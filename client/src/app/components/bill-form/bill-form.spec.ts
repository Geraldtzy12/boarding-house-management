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

  it('should emit cancelled when Escape is pressed inside the form', () => {
    let cancelled = false;
    component.cancelled.subscribe(() => cancelled = true);
    const form = fixture.nativeElement.querySelector('form') as HTMLElement;
    form.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(cancelled).toBe(true);
  });

  it('should focus the Tenant field when the form opens', () => {
    expect(document.activeElement?.getAttribute('name')).toBe('tenantId');
  });

  it('should show the tenant error only after leaving the field with no tenant chosen', () => {
    expect(fixture.nativeElement.textContent).not.toContain('Choose a tenant.');
    const select = fixture.nativeElement.querySelector('select[name="tenantId"]') as HTMLSelectElement;
    select.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Choose a tenant.');
  });

  it('should show the amount error after leaving a zero amount', () => {
    expect(fixture.nativeElement.textContent).not.toContain('Amount must be more than 0.');
    const input = fixture.nativeElement.querySelector('input[name="amount"]') as HTMLInputElement;
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Amount must be more than 0.');
  });

  it('should not save when nothing is chosen yet', () => {
    let saved = false;
    component.saved.subscribe(() => saved = true);
    component.submit();
    expect(saved).toBe(false);
  });
});
