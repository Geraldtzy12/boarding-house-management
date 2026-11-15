import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show an error when submitted empty', () => {
    component.onSubmit();
    expect(component.error()).toBe('Enter your username and password.');
  });

  it('should toggle the password between hidden and visible', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[name="password"]') as HTMLInputElement;
    const eye = compiled.querySelector('.eye') as HTMLButtonElement;

    expect(input.type).toBe('password');
    eye.click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
    expect(eye.getAttribute('aria-label')).toBe('Hide password');
    eye.click();
    fixture.detectChanges();
    expect(input.type).toBe('password');
    expect(eye.getAttribute('aria-label')).toBe('Show password');
  });
});
