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
});
