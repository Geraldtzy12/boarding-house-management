import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SettingsPage } from './settings-page';
import { AuthService } from '../../services/auth.service';

describe('SettingsPage', () => {
  let component: SettingsPage;
  let fixture: ComponentFixture<SettingsPage>;
  let logoutCalls = 0;

  beforeEach(async () => {
    logoutCalls = 0;
    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [{ provide: AuthService, useValue: { logout: () => { logoutCalls++; } } }],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the Settings heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')?.textContent).toContain('Settings');
  });

  it('should log out when the button is clicked', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    expect(logoutCalls).toBe(1);
  });
});
