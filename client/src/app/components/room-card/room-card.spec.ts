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

  it('should open edit when the card itself is clicked', () => {
    let edited: Room | undefined;
    component.edit.subscribe(r => edited = r);
    const card = fixture.nativeElement.querySelector('.room-card') as HTMLElement;
    card.click();
    expect(edited?.roomNo).toBe('101');
  });

  it('should emit edit only once when the Edit button is clicked (no double open)', () => {
    let editCount = 0;
    component.edit.subscribe(() => editCount++);
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons.find(b => b.textContent?.trim() === 'Edit')?.click();
    expect(editCount).toBe(1);
  });

  it('should delete without opening edit when the Delete button is clicked', () => {
    let editCount = 0;
    let removed: number | undefined;
    component.edit.subscribe(() => editCount++);
    component.remove.subscribe(id => removed = id);
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons.find(b => b.textContent?.trim() === 'Delete')?.click();
    expect(removed).toBe(1);
    expect(editCount).toBe(0);
  });
});
