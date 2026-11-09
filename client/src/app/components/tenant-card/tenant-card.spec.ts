import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TenantCard } from './tenant-card';

describe('TenantCard', () => {
  let component: TenantCard;
  let fixture: ComponentFixture<TenantCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantCard],
    }).compileComponents();

    fixture = TestBed.createComponent(TenantCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
