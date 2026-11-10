import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Bill, BillType } from '../models/bill';

export interface GenerateResult {
  month: string;
  created: number;
}

export interface BillPayload {
  tenantId: number;
  type: BillType;
  month: string;
  amount: number;
  dueDate: string;
  note: string | null;
}

@Injectable({ providedIn: 'root' })
export class BillService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:5262/api/bills';

  getAll(): Observable<Bill[]> {
    return this.http.get<Bill[]>(this.baseUrl);
  }

  create(payload: BillPayload): Observable<Bill> {
    return this.http.post<Bill>(this.baseUrl, payload);
  }

  generate(month: string): Observable<GenerateResult> {
    const params = new HttpParams().set('month', month);
    return this.http.post<GenerateResult>(`${this.baseUrl}/generate`, {}, { params });
  }

  pay(id: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/pay`, {});
  }
}