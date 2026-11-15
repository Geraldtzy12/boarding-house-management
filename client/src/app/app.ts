import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected auth = inject(AuthService);

  menuOpen = signal(false);
  pendingLogout = signal(false);

  toggleMenu() {
    this.menuOpen.update(open => !open);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  onLogoutClick() {
    this.closeMenu();
    this.pendingLogout.set(true);
  }

  onCancelLogout() {
    this.pendingLogout.set(false);
  }

  onConfirmLogout() {
    this.pendingLogout.set(false);
    this.auth.logout();
  }
}
