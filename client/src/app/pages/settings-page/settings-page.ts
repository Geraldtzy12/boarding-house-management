import { Component, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-settings-page',
  imports: [],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css'
})
export class SettingsPage {
  private auth = inject(AuthService);

  logout() {
    this.auth.logout();
  }
}
