import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { RealtimeService } from './services/realtime.service';

// A fake JWT that AuthService accepts as logged in (expiry far in the future).
const fakeToken = 'x.eyJleHAiOjk5OTk5OTk5OTl9.x';

// Dummy target for the '/login' route logout() navigates to.
@Component({ selector: 'app-dummy', template: '' })
class DummyComponent {}

describe('App', () => {
  beforeEach(async () => {
    localStorage.setItem('bh_token', fakeToken);
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: 'login', component: DummyComponent },
          { path: 'dashboard', component: DummyComponent },
          { path: 'rooms', component: DummyComponent },
        ]),
        // The app opens the real-time connection when logged in; the fake
        // keeps the tests from touching a real SignalR hub.
        { provide: RealtimeService, useValue: { start: () => {}, stop: () => {} } },
      ],
    })
      .compileComponents();
  });

  afterEach(() => {
    localStorage.removeItem('bh_token');
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Boarding House');
  });

  it('should show the sidebar links when logged in', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(compiled.querySelectorAll('.sidebar nav a')).map(a => a.textContent?.trim());
    expect(links).toContain('Dashboard');
    expect(links).toContain('Rooms');
    expect(links).toContain('Tenants');
    expect(links).toContain('Bills');
    // Settings lives in the account menu now, not in the sidebar itself.
    expect(links).not.toContain('Settings');
  });

  it('should show the admin chip only on the dashboard', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    await fixture.whenStable();

    // The app starts on the dashboard, so the chip shows.
    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.user-chip')).toBeTruthy();

    await router.navigateByUrl('/rooms');
    fixture.detectChanges();
    await fixture.whenStable();
    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.user-chip')).toBeNull();

    await router.navigateByUrl('/dashboard');
    fixture.detectChanges();
    await fixture.whenStable();
    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.user-chip')).toBeTruthy();
  });

  it('should open the account menu when the admin chip is clicked', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.account-menu')).toBeNull();

    (compiled.querySelector('.user-chip') as HTMLButtonElement).click();
    fixture.detectChanges();

    const menu = compiled.querySelector('.account-menu') as HTMLElement;
    expect(menu).toBeTruthy();
    expect(menu.textContent).toContain('Settings');
    expect(menu.textContent).toContain('Recycle Bin');
    expect(menu.textContent).toContain('Log out');
  });

  it('should ask for confirmation before logging out', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    (compiled.querySelector('.user-chip') as HTMLButtonElement).click();
    fixture.detectChanges();

    const buttons = Array.from(compiled.querySelectorAll('.account-menu button')) as HTMLButtonElement[];
    buttons.find(b => b.textContent?.trim() === 'Log out')?.click();
    fixture.detectChanges();

    const modal = compiled.querySelector('.confirm-modal') as HTMLElement;
    expect(modal).toBeTruthy();
    expect(modal.textContent).toContain('Log out?');
    // Still logged in until the log out is confirmed.
    expect(localStorage.getItem('bh_token')).toBe(fakeToken);
  });

  it('should log out when the log out is confirmed', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    (compiled.querySelector('.user-chip') as HTMLButtonElement).click();
    fixture.detectChanges();

    const menuButtons = Array.from(compiled.querySelectorAll('.account-menu button')) as HTMLButtonElement[];
    menuButtons.find(b => b.textContent?.trim() === 'Log out')?.click();
    fixture.detectChanges();

    const modalButtons = Array.from(compiled.querySelectorAll('.confirm-modal button')) as HTMLButtonElement[];
    modalButtons.find(b => b.textContent?.trim() === 'Log out')?.click();
    expect(localStorage.getItem('bh_token')).toBeNull();
  });

  it('should stay logged in when the log out is cancelled', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    (compiled.querySelector('.user-chip') as HTMLButtonElement).click();
    fixture.detectChanges();

    const menuButtons = Array.from(compiled.querySelectorAll('.account-menu button')) as HTMLButtonElement[];
    menuButtons.find(b => b.textContent?.trim() === 'Log out')?.click();
    fixture.detectChanges();

    const modalButtons = Array.from(compiled.querySelectorAll('.confirm-modal button')) as HTMLButtonElement[];
    modalButtons.find(b => b.textContent?.trim() === 'Cancel')?.click();
    fixture.detectChanges();

    expect(compiled.querySelector('.confirm-modal')).toBeNull();
    expect(localStorage.getItem('bh_token')).toBe(fakeToken);
  });

  it('should close the account menu when Escape is pressed', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    app.menuOpen.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.account-menu')).toBeTruthy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(app.menuOpen()).toBe(false);
    expect(fixture.nativeElement.querySelector('.account-menu')).toBeNull();
  });

  it('should cancel the log out confirmation when Escape is pressed', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    app.pendingLogout.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.confirm-modal')).toBeTruthy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(app.pendingLogout()).toBe(false);
    expect(fixture.nativeElement.querySelector('.confirm-modal')).toBeNull();
  });
});