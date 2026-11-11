import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TenantForm } from './tenant-form';
import { Room } from '../../models/room';

describe('TenantForm', () => {
  let component: TenantForm;
  let fixture: ComponentFixture<TenantForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantForm],
    }).compileComponents();

    fixture = TestBed.createComponent(TenantForm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('rooms', [
      {
        id: 1,
        roomNo: '101',
        monthlyRate: 3500,
        capacity: 1,
        status: 'Vacant',
      },
      {
        id: 2,
        roomNo: '102',
        monthlyRate: 3500,
        capacity: 1,
        status: 'Occupied',
      },
    ] satisfies Room[]);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should disable occupied rooms in the dropdown', () => {
    const options = fixture.nativeElement.querySelectorAll('option') as NodeListOf<HTMLOptionElement>;
    const occupied = Array.from(options).find(o => o.textContent?.includes('102'));
    const vacant = Array.from(options).find(o => o.textContent?.includes('101'));
    expect(occupied?.disabled).toBe(true);
    expect(occupied?.textContent).toContain('not available');
    expect(vacant?.disabled).toBe(false);
  });

  it('should show the error passed from the page', async () => {
    fixture.componentRef.setInput('error', 'There is already a tenant named Juan.');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.error')?.textContent).toContain('There is already a tenant named Juan.');
  });
});
