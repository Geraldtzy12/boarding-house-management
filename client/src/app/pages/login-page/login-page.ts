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
  error = signal('');
  busy = signal(false);

  constructor() {
    if (this.auth.loggedIn()) this.router.navigate(['/rooms']);
  }

  onSubmit() {
    this.error.set('');
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
}
