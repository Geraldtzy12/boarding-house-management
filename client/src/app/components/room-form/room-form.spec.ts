import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomForm, RoomDraft } from './room-form';

describe('RoomForm', () => {
  let component: RoomForm;
  let fixture: ComponentFixture<RoomForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomForm],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the error passed from the page', async () => {
    fixture.componentRef.setInput('error', 'There is already a room with number 101.');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.error')?.textContent).toContain('There is already a room with number 101.');
  });

  it('should include the room type when saving', () => {
    let draft: RoomDraft | undefined;
    component.saved.subscribe(d => draft = d);
    component.roomNo.set('201');
    component.monthlyRate.set(2500);
    component.capacity.set(1);
    component.type.set('Studio');
    component.submit();
    expect(draft?.roomNo).toBe('201');
    expect(draft?.type).toBe('Studio');
  });

  it('should emit cancelled when Escape is pressed inside the form', () => {
    let cancelled = false;
    component.cancelled.subscribe(() => cancelled = true);
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form') as HTMLElement;
    form.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(cancelled).toBe(true);
  });

  it('should focus the Room No. field when the form opens', () => {
    fixture.detectChanges();
    expect(document.activeElement?.getAttribute('name')).toBe('roomNo');
  });

  it('should show the room number error only after leaving the field empty', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Room number is required.');
    const input = fixture.nativeElement.querySelector('input[name="roomNo"]') as HTMLInputElement;
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Room number is required.');
  });

  it('should show the rate error after leaving a zero rate', () => {
    fixture.detectChanges();
    component.monthlyRate.set(0);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Monthly rate must be more than 0.');
    const input = fixture.nativeElement.querySelector('input[name="monthlyRate"]') as HTMLInputElement;
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Monthly rate must be more than 0.');
  });

  it('should show the capacity error after leaving a zero capacity', () => {
    fixture.detectChanges();
    component.capacity.set(0);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[name="capacity"]') as HTMLInputElement;
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Capacity must be at least 1.');
  });
});
