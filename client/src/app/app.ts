import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { RealtimeService } from './services/realtime.service';
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
  private realtime = inject(RealtimeService);

  menuOpen = signal(false);
  pendingLogout = signal(false);

  constructor() {
    // Already logged in (page reload): open the real-time connection.
    if (this.auth.loggedIn()) this.realtime.start();
  }

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
    this.realtime.stop();
    this.auth.logout();
  }
}
