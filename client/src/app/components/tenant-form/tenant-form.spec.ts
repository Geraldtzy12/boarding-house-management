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
    // Room 102 holds 1 of 1 beds, so it is full.
    fixture.componentRef.setInput('roomOccupancy', { 2: 1 });
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should disable full rooms in the dropdown', () => {
    const options = fixture.nativeElement.querySelectorAll('option') as NodeListOf<HTMLOptionElement>;
    const full = Array.from(options).find(o => o.textContent?.includes('102'));
    const vacant = Array.from(options).find(o => o.textContent?.includes('101'));
    expect(full?.disabled).toBe(true);
    expect(full?.textContent).toContain('full');
    expect(vacant?.disabled).toBe(false);
  });

  it('should keep an occupied room with space in the dropdown', () => {
    fixture.componentRef.setInput('rooms', [
      { id: 2, roomNo: '102', monthlyRate: 3500, capacity: 4, status: 'Occupied' },
    ] satisfies Room[]);
    fixture.componentRef.setInput('roomOccupancy', { 2: 2 });
    fixture.detectChanges();
    const options = fixture.nativeElement.querySelectorAll('option') as NodeListOf<HTMLOptionElement>;
    const room102 = Array.from(options).find(o => o.textContent?.includes('102'));
    expect(room102?.disabled).toBe(false);
    expect(room102?.textContent).toContain('2/4');
  });

  it('should keep the tenant\'s own room available when editing, even when it is full', () => {
    fixture.componentRef.setInput('tenant', {
      id: 1, name: 'Juan Dela Cruz', contact: '09170000001',
      roomId: 2, leaseStart: '2026-10-01', isActive: true,
    });
    fixture.detectChanges();
    const options = fixture.nativeElement.querySelectorAll('option') as NodeListOf<HTMLOptionElement>;
    const ownRoom = Array.from(options).find(o => o.textContent?.includes('102'));
    expect(ownRoom?.disabled).toBe(false);
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

  it('should show an error when the contact number is not 10 digits starting with 9', () => {
    component.onContactChanged('91700000');
    expect(component.contactError()).toBe('Contact number must be 10 digits starting with 9.');
    expect(component.canSave()).toBe(false);

    component.onContactChanged('91700000111');
    expect(component.contactError()).toBe('Contact number must be 10 digits starting with 9.');
    expect(component.canSave()).toBe(false);

    component.onContactChanged('2170000001');
    expect(component.contactError()).toBe('Contact number must be 10 digits starting with 9.');
    expect(component.canSave()).toBe(false);

    component.onContactChanged('9170000001');
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

  it('should only allow saving with a 10-digit contact number starting with 9, stored with the 0 back', () => {
    let draft: { contact: string } | undefined;
    component.saved.subscribe(d => draft = d);
    component.name.set('Juan Dela Cruz');
    component.leaseStart.set('2026-11-01');

    component.onContactChanged('91700000');
    component.submit();
    expect(draft).toBeUndefined();

    component.onContactChanged('9170000001');
    expect(component.canSave()).toBe(true);
    component.submit();
    expect(draft?.contact).toBe('09170000001');
  });

  it('should show an error when the name contains numbers or symbols', () => {
    component.name.set('1233123123');
    component.nameTouched.set(true);
    expect(component.nameError()).toBe('Name must contain letters only.');
    expect(component.canSave()).toBe(false);

    component.name.set('Kim123');
    expect(component.nameError()).toBe('Name must contain letters only.');

    component.name.set('Angelica Kudera )*sqndjsd');
    expect(component.nameError()).toBe('Name must contain letters only.');
    expect(component.canSave()).toBe(false);

    component.name.set('Anne-Marie');
    expect(component.nameError()).toBe('');

    component.name.set('Juan Dela Cruz');
    expect(component.nameError()).toBe('');
  });

  it('should show the stored number without the 0 when editing', () => {
    fixture.componentRef.setInput('tenant', {
      id: 1, name: 'Juan Dela Cruz', contact: '09170000001',
      roomId: 1, leaseStart: '2026-10-01', isActive: true,
    });
    fixture.detectChanges();
    expect(component.contact()).toBe('9170000001');
    expect(component.canSave()).toBe(true);
  });

  it('should focus the Name field when the form opens', () => {
    expect(document.activeElement?.getAttribute('name')).toBe('name');
  });

  it('should show the name error only after leaving the field empty', () => {
    expect(fixture.nativeElement.textContent).not.toContain('Name is required.');
    const input = fixture.nativeElement.querySelector('input[name="name"]') as HTMLInputElement;
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Name is required.');
  });

  it('should show the contact error only after leaving a short number', () => {
    component.onContactChanged('91700000');
    fixture.detectChanges();
    // The error is computed, but it stays hidden until the field is left.
    expect(fixture.nativeElement.textContent).not.toContain('Contact number must be 10 digits starting with 9.');
    const input = fixture.nativeElement.querySelector('input[name="contact"]') as HTMLInputElement;
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Contact number must be 10 digits starting with 9.');
  });
});