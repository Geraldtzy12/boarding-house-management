import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { of, throwError, type Observable } from 'rxjs';
import { SettingsPage } from './settings-page';
import { AuthService } from '../../services/auth.service';
import { BackupService } from '../../services/backup.service';

describe('SettingsPage', () => {
  let component: SettingsPage;
  let fixture: ComponentFixture<SettingsPage>;
  let changePasswordCalls: [string, string][];
  let changePasswordResult: Observable<void> | Observable<never>;
  let backupCalls: string[];
  let backupResult: Observable<HttpResponse<Blob>> | Observable<never>;

  beforeEach(async () => {
    changePasswordCalls = [];
    changePasswordResult = of(void 0);
    const fakeAuth = {
      changePassword: (current: string, next: string) => {
        changePasswordCalls.push([current, next]);
        return changePasswordResult;
      }
    };

    backupCalls = [];
    backupResult = of(new HttpResponse({ body: new Blob() }));
    const fakeBackup = {
      downloadDatabase: () => {
        backupCalls.push('database');
        return backupResult;
      },
      exportBills: () => {
        backupCalls.push('bills');
        return backupResult;
      },
      exportTenants: () => {
        backupCalls.push('tenants');
        return backupResult;
      }
    };

    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [
        { provide: AuthService, useValue: fakeAuth },
        { provide: BackupService, useValue: fakeBackup },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function clickButton(label: string) {
    const compiled = fixture.nativeElement as HTMLElement;
    const button = Array.from(compiled.querySelectorAll('button'))
      .find(b => b.textContent?.includes(label));
    expect(button).toBeTruthy();
    button!.click();
    fixture.detectChanges();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the Settings heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')?.textContent).toContain('Settings');
  });

  it('should show an error when the new passwords do not match', () => {
    component.currentPassword = 'oldpass';
    component.newPassword = 'newpass123';
    component.confirmPassword = 'different';
    component.onChangePassword();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.error')?.textContent).toContain('do not match');
    expect(changePasswordCalls).toEqual([]);
  });

  it('should show an error when the new password is too short', () => {
    component.currentPassword = 'oldpass';
    component.newPassword = 'short';
    component.confirmPassword = 'short';
    component.onChangePassword();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.error')?.textContent).toContain('at least 6 characters');
    expect(changePasswordCalls).toEqual([]);
  });

  it('should call changePassword and show the success message', () => {
    component.currentPassword = 'oldpass';
    component.newPassword = 'newpass123';
    component.confirmPassword = 'newpass123';
    component.onChangePassword();
    fixture.detectChanges();

    expect(changePasswordCalls).toEqual([['oldpass', 'newpass123']]);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.message')?.textContent).toContain('Password changed.');
    expect(component.currentPassword).toBe('');
    expect(component.newPassword).toBe('');
  });

  it('should show the current-password error on a 401', () => {
    changePasswordResult = throwError(() => new HttpErrorResponse({ status: 401, error: 'The current password is incorrect.' }));
    component.currentPassword = 'wrong';
    component.newPassword = 'newpass123';
    component.confirmPassword = 'newpass123';
    component.onChangePassword();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.error')?.textContent).toContain('The current password is incorrect.');
  });

  it('should download the database backup and show the success message', () => {
    clickButton('Download database backup');

    expect(backupCalls).toEqual(['database']);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.message')?.textContent).toContain('Database backup downloaded.');
  });

  it('should export bills when Export bills is clicked', () => {
    clickButton('Export bills (CSV)');

    expect(backupCalls).toEqual(['bills']);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.message')?.textContent).toContain('Bills exported.');
  });

  it('should export tenants when Export tenants is clicked', () => {
    clickButton('Export tenants (CSV)');

    expect(backupCalls).toEqual(['tenants']);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.message')?.textContent).toContain('Tenants exported.');
  });

  it('should show an error when the download fails', () => {
    backupResult = throwError(() => new HttpErrorResponse({ status: 500 }));
    clickButton('Download database backup');

    expect(backupCalls).toEqual(['database']);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.error')?.textContent).toContain('Could not download the file.');
  });
});
