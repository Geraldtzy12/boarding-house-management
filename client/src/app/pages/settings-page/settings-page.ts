import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { BackupService } from '../../services/backup.service';

@Component({
  selector: 'app-settings-page',
  imports: [FormsModule],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css'
})
export class SettingsPage {
  private auth = inject(AuthService);
  private backup = inject(BackupService);

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  message = signal('');
  error = signal('');
  busy = signal(false);

  backupMessage = signal('');
  backupError = signal('');
  backupBusy = signal(false);

  onChangePassword() {
    this.message.set('');
    this.error.set('');
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.error.set('Fill in all three fields.');
      return;
    }
    if (this.newPassword.length < 6) {
      this.error.set('The new password must be at least 6 characters.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error.set('The new passwords do not match.');
      return;
    }
    if (this.newPassword === this.currentPassword) {
      this.error.set('The new password must be different from the current password.');
      return;
    }
    this.busy.set(true);
    this.auth.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.busy.set(false);
        this.message.set('Password changed.');
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(
          err.status === 401 ? 'The current password is incorrect.'
          : typeof err.error === 'string' && err.error ? err.error
          : 'Could not change the password. Is the API running?');
      }
    });
  }

  onDownloadDatabase() {
    this.download(this.backup.downloadDatabase(), 'Database backup downloaded.');
  }

  onExportBills() {
    this.download(this.backup.exportBills(), 'Bills exported.');
  }

  onExportTenants() {
    this.download(this.backup.exportTenants(), 'Tenants exported.');
  }

  private download(request: ReturnType<BackupService['downloadDatabase']>, successMessage: string) {
    this.backupMessage.set('');
    this.backupError.set('');
    this.backupBusy.set(true);
    request.subscribe({
      next: () => {
        this.backupBusy.set(false);
        this.backupMessage.set(successMessage);
      },
      error: () => {
        this.backupBusy.set(false);
        this.backupError.set('Could not download the file. Is the API running?');
      }
    });
  }
}
