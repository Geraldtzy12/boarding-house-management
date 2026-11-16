import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TenantForm } from './tenant-form';
import { Room } from '../../models/room';

describe('TenantForm', () => {
  let component: TenantForm;
  let fixture: ComponentFixture<TenantForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantForm],
    }).compileComponents();

    fixture = TestBed.createComponent(TenantForm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('rooms', [
      {
        id: 1,
        roomNo: '101',
        monthlyRate: 3500,
        capacity: 1,
        status: 'Vacant',
      },
      {
        id: 2,
        roomNo: '102',
        monthlyRate: 3500,
        capacity: 1,
        status: 'Occupied',
      },
    ] satisfies Room[]);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should disable occupied rooms in the dropdown', () => {
    const options = fixture.nativeElement.querySelectorAll('option') as NodeListOf<HTMLOptionElement>;
    const occupied = Array.from(options).find(o => o.textContent?.includes('102'));
    const vacant = Array.from(options).find(o => o.textContent?.includes('101'));
    expect(occupied?.disabled).toBe(true);
    expect(occupied?.textContent).toContain('not available');
    expect(vacant?.disabled).toBe(false);
  });

  it('should show the error passed from the page', async () => {
    fixture.componentRef.setInput('error', 'There is already a tenant named Juan.');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.error')?.textContent).toContain('There is already a tenant named Juan.');
  });

  it('should show the +63 prefix on the contact field', () => {
    expect(fixture.nativeElement.querySelector('.phone-prefix')?.textContent).toContain('+63');
  });

  it('should keep only digits in the contact number', () => {
    component.onContactChanged('0921-302-133');
    expect(component.contact()).toBe('0921302133');
  });

  it('should show an error when the contact number is not 11 digits', () => {
    component.onContactChanged('091700000');
    expect(component.contactError()).toBe('Contact number must be 11 digits.');
    expect(component.canSave()).toBe(false);

    component.onContactChanged('0917000000111');
    expect(component.contactError()).toBe('Contact number must be 11 digits.');
    expect(component.canSave()).toBe(false);

    component.onContactChanged('09170000001');
    expect(component.contactError()).toBe('');
  });

  it('should emit cancelled when Escape is pressed inside the form', () => {
    let cancelled = false;
    component.cancelled.subscribe(() => cancelled = true);
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form') as HTMLElement;
    form.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(cancelled).toBe(true);
  });

  it('should only allow saving with an 11-digit contact number', () => {
    let draft: { contact: string } | undefined;
    component.saved.subscribe(d => draft = d);
    component.name.set('Juan Dela Cruz');
    component.leaseStart.set('2026-11-01');

    component.onContactChanged('091700000');
    component.submit();
    expect(draft).toBeUndefined();

    component.onContactChanged('09170000001');
    expect(component.canSave()).toBe(true);
    component.submit();
    expect(draft?.contact).toBe('09170000001');
  });
});
