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
});
