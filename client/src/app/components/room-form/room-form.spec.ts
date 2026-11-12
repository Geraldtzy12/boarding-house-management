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
});
