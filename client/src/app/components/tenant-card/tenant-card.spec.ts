import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TenantCard } from './tenant-card';
import { Tenant } from '../../models/tenant';

describe('TenantCard', () => {
  let component: TenantCard;
  let fixture: ComponentFixture<TenantCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantCard],
    }).compileComponents();

    fixture = TestBed.createComponent(TenantCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tenant', {
      id: 1,
      name: 'Juan Dela Cruz',
      contact: '09171234567',
      roomId: 1,
      room: {
        id: 1,
        roomNo: '101',
        monthlyRate: 3500,
        capacity: 2,
        status: 'Occupied',
      },
      leaseStart: '2026-11-01',
      isActive: true,
    } satisfies Tenant);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open edit when the card itself is clicked', () => {
    let edited: Tenant | undefined;
    component.edit.subscribe(t => edited = t);
    const card = fixture.nativeElement.querySelector('.tenant-card') as HTMLElement;
    card.click();
    expect(edited?.name).toBe('Juan Dela Cruz');
  });

  it('should emit edit only once when the Edit button is clicked (no double open)', () => {
    let editCount = 0;
    component.edit.subscribe(() => editCount++);
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons.find(b => b.textContent?.trim() === 'Edit')?.click();
    expect(editCount).toBe(1);
  });

  it('should move out without opening edit when the Move out button is clicked', () => {
    let editCount = 0;
    let movedOut: number | undefined;
    component.edit.subscribe(() => editCount++);
    component.moveOut.subscribe(id => movedOut = id);
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons.find(b => b.textContent?.trim() === 'Move out')?.click();
    expect(movedOut).toBe(1);
    expect(editCount).toBe(0);
  });
});
