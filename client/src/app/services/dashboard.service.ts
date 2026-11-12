import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardSummary } from '../models/dashboard';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:5262/api/dashboard';

  getSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(this.baseUrl);
  }
}
