import { Component, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
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
  private router = inject(Router);

  menuOpen = signal(false);
  pendingLogout = signal(false);
  pageTitle = signal('Dashboard');
  // The admin profile in the topbar only shows on the Dashboard page.
  isDashboard = signal(true);

  constructor() {
    // The topbar shows the current page's title; update it on navigation.
    this.pageTitle.set(this.titleFor(this.router.url));
    this.isDashboard.set(this.titleFor(this.router.url) === 'Dashboard');
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(e => {
      this.pageTitle.set(this.titleFor(e.urlAfterRedirects));
      this.isDashboard.set(this.titleFor(e.urlAfterRedirects) === 'Dashboard');
      this.closeMenu();
    });

    // Already logged in (page reload): open the real-time connection.
    if (this.auth.loggedIn()) this.realtime.start();
  }

  // "Thursday, November 26, 2026" — the date shown in the topbar.
  todayLabel(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private titleFor(url: string): string {
    const path = url.split('?')[0].split('#')[0];
    switch (path) {
      case '/rooms': return 'Rooms';
      case '/tenants': return 'Tenants';
      case '/bills': return 'Bills';
      case '/settings': return 'Settings';
      case '/recycle-bin': return 'Recycle Bin';
      default: return 'Dashboard';
    }
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