import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TenantsPage } from './tenants-page';
import { TenantService } from '../../services/tenant.service';
import { RoomService } from '../../services/room.service';

describe('TenantsPage', () => {
  let component: TenantsPage;
  let fixture: ComponentFixture<TenantsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantsPage],
      providers: [
        // Mocked loads so ngOnInit succeeds and the tests control the error banner.
        { provide: TenantService, useValue: { getAll: () => of([]) } },
        { provide: RoomService, useValue: { getAll: () => of([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TenantsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should hide the page error banner while the form is open (error shows inside the modal instead)', async () => {
    component.error.set('There is already a tenant named angel.');
    component.showForm.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    const errors = fixture.nativeElement.querySelectorAll('.error');
    expect(errors.length).toBe(1);
    expect(errors[0].closest('app-tenant-form')).toBeTruthy();
  });

  it('should show the page error banner when the form is closed', async () => {
    component.error.set('Hindi ma-load ang tenants. Tumatakbo ba ang API?');
    component.showForm.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    const errors = fixture.nativeElement.querySelectorAll('.error');
    expect(errors.length).toBe(1);
    expect(errors[0].textContent).toContain('Hindi ma-load ang tenants');
  });

  it('should close the open form when Escape is pressed', () => {
    component.showForm.set(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(component.showForm()).toBe(false);
  });
});
