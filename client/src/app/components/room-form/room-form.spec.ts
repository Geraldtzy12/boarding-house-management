import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomForm } from './room-form';

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
});
