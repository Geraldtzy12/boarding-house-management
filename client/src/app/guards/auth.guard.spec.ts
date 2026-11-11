import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

function fakeToken(expiresInSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expiresInSeconds }));
  return `${header}.${payload}.signature`;
}

// The guard ignores the route and state, so empty snapshots are fine.
function runGuard() {
  return TestBed.runInInjectionContext(() =>
    authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
}

describe('authGuard', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([])]
    });
  });

  it('should allow navigation when logged in with a valid token', () => {
    localStorage.setItem('bh_token', fakeToken(3600));
    TestBed.inject(AuthService); // reads the token on creation
    expect(runGuard()).toBe(true);
  });

  it('should redirect to /login when there is no token', () => {
    const result = runGuard() as UrlTree;
    expect(result.toString()).toBe('/login');
  });

  it('should redirect to /login when the token is expired', () => {
    localStorage.setItem('bh_token', fakeToken(-3600));
    TestBed.inject(AuthService); // reads the token on creation
    const result = runGuard() as UrlTree;
    expect(result.toString()).toBe('/login');
  });
});
