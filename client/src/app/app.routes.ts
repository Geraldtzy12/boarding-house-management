import { Routes } from '@angular/router';
import { RoomsPage } from './pages/rooms-page/rooms-page';
import { TenantsPage } from './pages/tenants-page/tenants-page';
import { BillsPage } from './pages/bills-page/bills-page';
import { DashboardPage } from './pages/dashboard-page/dashboard-page';
import { LoginPage } from './pages/login-page/login-page';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginPage },
  { path: 'dashboard', component: DashboardPage, canActivate: [authGuard] },
  { path: 'rooms', component: RoomsPage, canActivate: [authGuard] },
  { path: 'tenants', component: TenantsPage, canActivate: [authGuard] },
  { path: 'bills', component: BillsPage, canActivate: [authGuard] }
];
