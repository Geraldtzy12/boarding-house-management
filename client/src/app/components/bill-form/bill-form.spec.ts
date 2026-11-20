import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BillForm } from './bill-form';
import { Tenant } from '../../models/tenant';
import { Room } from '../../models/room';
import { BillPayload } from '../../services/bill.service';

describe('BillForm', () => {
  let component: BillForm;
  let fixture: ComponentFixture<BillForm>;

  const optionsOf = (name: string) =>
    Array.from(fixture.nativeElement.querySelectorAll(`select[name="${name}"] option`) as NodeListOf<HTMLOptionElement>)
      .map(o => o.textContent?.trim());

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BillForm],
    }).compileComponents();

    fixture = TestBed.createComponent(BillForm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('rooms', [
      { id: 1, roomNo: '101', monthlyRate: 2500, capacity: 2, status: 'Vacant' },
      { id: 2, roomNo: '103', monthlyRate: 5000, capacity: 4, status: 'Occupied' },
      { id: 3, roomNo: '104', monthlyRate: 3000, capacity: 1, status: 'Vacant' },
    ] satisfies Room[]);
    fixture.componentRef.setInput('tenants', [
      { id: 1, name: 'Juan Dela Cruz', contact: '09171234567', roomId: 1, leaseStart: '2026-11-01', isActive: true },
      { id: 2, name: 'Maria Santos', contact: '09170000002', roomId: 2, leaseStart: '2026-10-01', isActive: true },
      { id: 3, name: 'Pedro Reyes', contact: '09170000003', roomId: 2, leaseStart: '2026-10-01', isActive: true },
      { id: 4, name: 'Old Tenant', contact: '09170000004', roomId: 2, leaseStart: '2025-01-01', isActive: false },
    ] satisfies Tenant[]);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the save error at the top of the form', () => {
    expect(fixture.nativeElement.textContent).not.toContain('already has a Water bill');
    fixture.componentRef.setInput('error', 'Gerald Bonalos already has a Water bill for 2026-11.');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Gerald Bonalos already has a Water bill for 2026-11.');
  });

  it('should emit cancelled when Escape is pressed inside the form', () => {
    let cancelled = false;
    component.cancelled.subscribe(() => cancelled = true);
    const form = fixture.nativeElement.querySelector('form') as HTMLElement;
    form.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(cancelled).toBe(true);
  });

  it('should focus the Room field when the form opens', () => {
    expect(document.activeElement?.getAttribute('name')).toBe('roomId');
  });

  it('should list rooms in number order', () => {
    expect(optionsOf('roomId')).toEqual([
      '-- Choose a room --',
      'Room 101',
      'Room 103',
      'Room 104',
    ]);
  });

  it('should show only the tenants of the chosen room', () => {
    component.onRoomChanged(2);
    fixture.detectChanges();
    expect(optionsOf('tenantId')).toEqual([
      '-- Choose a tenant --',
      'Maria Santos',
      'Pedro Reyes',
    ]);
  });

  it('should auto-select the tenant when the room has only one', () => {
    component.onRoomChanged(1);
    fixture.detectChanges();
    expect(component.tenantId()).toBe(1);
    expect(optionsOf('tenantId')).toContain('Juan Dela Cruz');
  });

  it('should show no tenants and disable saving for a vacant room', () => {
    component.onRoomChanged(3);
    fixture.detectChanges();
    expect(component.roomTenants()).toEqual([]);
    expect(optionsOf('tenantId')).toEqual(['No tenants in this room']);
    expect(component.canSave()).toBe(false);
  });

  it('should reset the tenant when the room changes', () => {
    component.onRoomChanged(2);
    component.tenantId.set(2);
    expect(component.tenantId()).toBe(2);

    component.onRoomChanged(1);
    expect(component.tenantId()).toBe(1);   // only tenant in Room 101, auto-selected
  });

  it('should show the room error only after leaving the field with no room chosen', () => {
    expect(fixture.nativeElement.textContent).not.toContain('Choose a room.');
    const select = fixture.nativeElement.querySelector('select[name="roomId"]') as HTMLSelectElement;
    select.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Choose a room.');
  });

  it('should show the tenant error only after leaving the field with no tenant chosen', () => {
    component.onRoomChanged(2);   // two tenants, none auto-selected
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Choose a tenant.');
    const select = fixture.nativeElement.querySelector('select[name="tenantId"]') as HTMLSelectElement;
    select.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Choose a tenant.');
  });

  it('should auto-fill Rent with the room rate when a room is picked', () => {
    component.onRoomChanged(2);   // Room 103, ₱5,000
    expect(component.amountOf('Rent')).toBe(5000);

    component.onRoomChanged(1);   // Room 101, ₱2,500
    expect(component.amountOf('Rent')).toBe(2500);
  });

  it('should let the Rent amount be changed after auto-fill', () => {
    component.onRoomChanged(2);
    component.setAmount('Rent', 4500);
    expect(component.amountOf('Rent')).toBe(4500);
  });

  it('should reset the metered amounts when the tenant changes', () => {
    component.onRoomChanged(2);
    component.setAmount('Water', 850);
    expect(component.amountOf('Water')).toBe(850);

    component.onTenantChanged(2);
    expect(component.amountOf('Water')).toBe(0);
    expect(component.amountOf('Rent')).toBe(5000);   // same room, rent stays
  });

  it('should show the amount error after leaving the amounts with none filled', () => {
    expect(fixture.nativeElement.textContent).not.toContain('Enter an amount for at least one bill.');
    const input = fixture.nativeElement.querySelector('input[name="amount-Rent"]') as HTMLInputElement;
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Enter an amount for at least one bill.');
  });

  it('should not save when nothing is chosen yet', () => {
    let saved = false;
    component.saved.subscribe(() => saved = true);
    component.submit();
    expect(saved).toBe(false);
  });

  it('should not save when all amounts are zero', () => {
    let saved = false;
    component.saved.subscribe(() => saved = true);
    component.onRoomChanged(2);
    component.tenantId.set(3);
    component.setAmount('Rent', 0);
    component.submit();
    expect(saved).toBe(false);
  });

  it('should save one bill per filled amount', () => {
    let draft: BillPayload[] | undefined;
    component.saved.subscribe(d => draft = d);
    component.onRoomChanged(2);   // Room 103: Rent auto-fills to ₱5,000
    component.tenantId.set(3);
    component.setAmount('Water', 850);
    component.submit();
    expect(draft?.length).toBe(2);
    expect(draft?.map(d => d.type)).toEqual(['Rent', 'Water']);
    expect(draft?.map(d => d.amount)).toEqual([5000, 850]);
    expect(draft?.every(d => d.tenantId === 3)).toBe(true);
    expect(draft?.every(d => d.month === component.month())).toBe(true);
  });

  it('should show the result view instead of the fields when a result is set', () => {
    fixture.componentRef.setInput('result', [
      { type: 'Rent', amount: 5000, ok: true, message: '' },
      { type: 'Water', amount: 150, ok: false, message: 'Gerald Bonalos already has a Water bill for 2026-11.' },
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Created');
    expect(fixture.nativeElement.textContent).toContain('Gerald Bonalos already has a Water bill for 2026-11.');
    expect(fixture.nativeElement.querySelector('select[name="roomId"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('button')?.textContent).toContain('Done');
  });
});
