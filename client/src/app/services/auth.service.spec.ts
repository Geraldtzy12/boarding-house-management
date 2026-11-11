import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should store the token and mark logged in after a successful login', () => {
    service.login('admin', 'secret').subscribe();
    const req = httpMock.expectOne('http://localhost:5262/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush({ token: 'fake-jwt', username: 'admin' });
    expect(localStorage.getItem('bh_token')).toBe('fake-jwt');
    expect(service.loggedIn()).toBe(true);
  });

  it('should not store a token when login fails', () => {
    service.login('admin', 'wrong').subscribe({ error: () => {} });
    const req = httpMock.expectOne('http://localhost:5262/api/auth/login');
    req.flush('Invalid username or password.', { status: 401, statusText: 'Unauthorized' });
    expect(localStorage.getItem('bh_token')).toBeNull();
    expect(service.loggedIn()).toBe(false);
  });

  it('should clear the token on logout', () => {
    localStorage.setItem('bh_token', 'fake-jwt');
    service.logout();
    expect(localStorage.getItem('bh_token')).toBeNull();
    expect(service.loggedIn()).toBe(false);
  });
});
