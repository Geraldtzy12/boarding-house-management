import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tenant } from '../models/tenant';

export interface TenantPayload {
  id?: number;
  name: string;
  contact: string;
  roomId: number | null;
  leaseStart: string;
}

@Injectable({ providedIn: 'root' })
export class TenantService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:5262/api/tenants';

  getAll(): Observable<Tenant[]> {
    return this.http.get<Tenant[]>(this.baseUrl);
  }

  create(tenant: TenantPayload): Observable<Tenant> {
    return this.http.post<Tenant>(this.baseUrl, tenant);
  }

  update(tenant: TenantPayload & { id: number }): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${tenant.id}`, tenant);
  }

  moveOut(id: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/move-out`, {});
  }
}