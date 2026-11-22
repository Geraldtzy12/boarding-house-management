import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError, type Observable } from 'rxjs';
import { LoginPage } from './login-page';
import { AuthService } from '../../services/auth.service';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let forgotCalls: string[];
  let resetCalls: [string, string, string][];
  let forgotResult: Observable<{ message: string }>;
  let resetResult: Observable<void>;

  beforeEach(async () => {
    localStorage.clear();
    forgotCalls = [];
    resetCalls = [];
    forgotResult = of({ message: 'If the username exists, a reset code was printed to the API console. It is valid for 15 minutes.' });
    resetResult = of(void 0);
    const fakeAuth = {
      loggedIn: () => false,
      login: () => of({ token: 't', username: 'admin' }),
      forgotPassword: (username: string) => {
        forgotCalls.push(username);
        return forgotResult;
      },
      resetPassword: (username: string, code: string, newPassword: string) => {
        resetCalls.push([username, code, newPassword]);
        return resetResult;
      },
    };

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([]), { provide: AuthService, useValue: fakeAuth }],
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

  it('should show the Forgot password link', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.link')?.textContent).toContain('Forgot password?');
  });

  it('should show the reset form when Forgot password is clicked', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    (compiled.querySelector('.link') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.showForgot()).toBe(true);
    expect(compiled.querySelector('input[name="forgotUsername"]')).toBeTruthy();
    expect(compiled.querySelector('input[name="username"]')).toBeFalsy();
  });

  it('should send the reset code and show the code step', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    (compiled.querySelector('.link') as HTMLButtonElement).click();
    fixture.detectChanges();

    component.forgotUsername = 'admin';
    component.onSendCode();
    fixture.detectChanges();

    expect(forgotCalls).toEqual(['admin']);
    expect(component.codeSent()).toBe(true);
    expect(compiled.querySelector('.message')?.textContent).toContain('API console');
    expect(compiled.querySelector('input[name="forgotCode"]')).toBeTruthy();
  });

  it('should show an error when the reset passwords do not match', () => {
    component.showForgot.set(true);
    component.codeSent.set(true);
    component.forgotUsername = 'admin';
    component.forgotCode = '123456';
    component.forgotNewPassword = 'newpass123';
    component.forgotConfirmPassword = 'different';
    component.onResetPassword();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.error')?.textContent).toContain('do not match');
    expect(resetCalls).toEqual([]);
  });

  it('should show the invalid-code error on a 400', () => {
    resetResult = throwError(() => new HttpErrorResponse({ status: 400, error: 'The reset code is invalid or expired.' }));
    component.showForgot.set(true);
    component.codeSent.set(true);
    component.forgotUsername = 'admin';
    component.forgotCode = '000000';
    component.forgotNewPassword = 'newpass123';
    component.forgotConfirmPassword = 'newpass123';
    component.onResetPassword();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.error')?.textContent).toContain('invalid or expired');
  });

  it('should reset the password and go back to the login form', () => {
    component.showForgot.set(true);
    component.codeSent.set(true);
    component.forgotUsername = 'admin';
    component.forgotCode = '123456';
    component.forgotNewPassword = 'newpass123';
    component.forgotConfirmPassword = 'newpass123';
    component.onResetPassword();
    fixture.detectChanges();

    expect(resetCalls).toEqual([['admin', '123456', 'newpass123']]);
    expect(component.showForgot()).toBe(false);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.message')?.textContent).toContain('Password reset.');
    expect(compiled.querySelector('input[name="username"]')).toBeTruthy();
  });
});
