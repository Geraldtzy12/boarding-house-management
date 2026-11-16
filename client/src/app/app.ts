import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { ConfirmModal } from './components/confirm-modal/confirm-modal';
import { Toast } from './components/toast/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ConfirmModal, Toast],
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

  // Escape closes the log-out confirmation or the account menu (Week 3: global listener).
  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.pendingLogout()) this.onCancelLogout();
    else if (this.menuOpen()) this.closeMenu();
  }

  onConfirmLogout() {
    this.pendingLogout.set(false);
    this.auth.logout();
  }
}
