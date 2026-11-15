import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

// A fake JWT that AuthService accepts as logged in (expiry far in the future).
const fakeToken = 'x.eyJleHAiOjk5OTk5OTk5OTl9.x';

describe('App', () => {
  beforeEach(async () => {
    localStorage.setItem('bh_token', fakeToken);
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
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
    const links = Array.from(compiled.querySelectorAll('.sidebar a')).map(a => a.textContent?.trim());
    expect(links).toContain('Dashboard');
    expect(links).toContain('Rooms');
    expect(links).toContain('Tenants');
    expect(links).toContain('Bills');
    expect(links).toContain('Settings');
  });
});
