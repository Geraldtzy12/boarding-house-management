import { Routes } from '@angular/router';
import { RoomsPage } from './pages/rooms-page/rooms-page';
import { TenantsPage } from './pages/tenants-page/tenants-page';

export const routes: Routes = [
  { path: '', redirectTo: 'rooms', pathMatch: 'full' },
  { path: 'rooms', component: RoomsPage },
  { path: 'tenants', component: TenantsPage }
];