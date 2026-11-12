import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomCard } from './room-card';
import { Room } from '../../models/room';

describe('RoomCard', () => {
  let component: RoomCard;
  let fixture: ComponentFixture<RoomCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomCard],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('room', {
      id: 1,
      roomNo: '101',
      monthlyRate: 3500,
      capacity: 2,
      status: 'Vacant',
    } satisfies Room);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not show a tenant name when the room is vacant', () => {
    expect(fixture.nativeElement.textContent).not.toContain('Rented by');
  });

  it('should show the tenant name when the room is rented', () => {
    fixture.componentRef.setInput('tenantName', 'Juan Dela Cruz');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Rented by: Juan Dela Cruz');
  });

  it('should show the studio photo for a studio room', () => {
    fixture.componentRef.setInput('room', {
      id: 1,
      roomNo: '101',
      monthlyRate: 3500,
      capacity: 2,
      status: 'Vacant',
      type: 'Studio',
    } satisfies Room);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')?.getAttribute('src')).toBe('rooms/studio.webp');
    expect(fixture.nativeElement.textContent).toContain('Studio');
  });
});
