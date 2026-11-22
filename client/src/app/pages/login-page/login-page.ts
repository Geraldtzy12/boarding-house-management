import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css'
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  showPassword = signal(false);
  error = signal('');
  message = signal('');
  busy = signal(false);

  // Forgot password: the reset code is printed to the API console,
  // so step 1 sends the code and step 2 enters it with a new password.
  showForgot = signal(false);
  codeSent = signal(false);
  forgotUsername = '';
  forgotCode = '';
  forgotNewPassword = '';
  forgotConfirmPassword = '';
  forgotError = signal('');
  forgotMessage = signal('');
  forgotBusy = signal(false);

  constructor() {
    if (this.auth.loggedIn()) this.router.navigate(['/rooms']);
  }

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }

  onSubmit() {
    this.error.set('');
    this.message.set('');
    if (!this.username.trim() || !this.password) {
      this.error.set('Enter your username and password.');
      return;
    }
    this.busy.set(true);
    this.auth.login(this.username.trim(), this.password).subscribe({
      next: () => this.router.navigate(['/rooms']),
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(
          typeof err.error === 'string' && err.error
            ? err.error
            : 'Could not log in. Is the API running?');
      }
    });
  }

  toggleForgot() {
    this.showForgot.update(v => !v);
    this.forgotError.set('');
    this.forgotMessage.set('');
    this.codeSent.set(false);
  }

  onSendCode() {
    this.forgotError.set('');
    this.forgotMessage.set('');
    if (!this.forgotUsername.trim()) {
      this.forgotError.set('Enter your username.');
      return;
    }
    this.forgotBusy.set(true);
    this.auth.forgotPassword(this.forgotUsername.trim()).subscribe({
      next: (r) => {
        this.forgotBusy.set(false);
        this.codeSent.set(true);
        this.forgotMessage.set(r.message);
      },
      error: () => {
        this.forgotBusy.set(false);
        this.forgotError.set('Could not send the reset code. Is the API running?');
      }
    });
  }

  onResetPassword() {
    this.forgotError.set('');
    this.forgotMessage.set('');
    if (!this.forgotCode.trim() || !this.forgotNewPassword || !this.forgotConfirmPassword) {
      this.forgotError.set('Fill in the code and both password fields.');
      return;
    }
    if (this.forgotNewPassword.length < 6) {
      this.forgotError.set('The new password must be at least 6 characters.');
      return;
    }
    if (this.forgotNewPassword !== this.forgotConfirmPassword) {
      this.forgotError.set('The new passwords do not match.');
      return;
    }
    this.forgotBusy.set(true);
    this.auth.resetPassword(this.forgotUsername.trim(), this.forgotCode.trim(), this.forgotNewPassword).subscribe({
      next: () => {
        this.forgotBusy.set(false);
        this.showForgot.set(false);
        this.codeSent.set(false);
        this.forgotCode = '';
        this.forgotNewPassword = '';
        this.forgotConfirmPassword = '';
        this.message.set('Password reset. Log in with your new password.');
      },
      error: (err: HttpErrorResponse) => {
        this.forgotBusy.set(false);
        this.forgotError.set(
          err.status === 400 ? 'The reset code is invalid or expired.'
          : typeof err.error === 'string' && err.error ? err.error
          : 'Could not reset the password. Is the API running?');
      }
    });
  }
}
