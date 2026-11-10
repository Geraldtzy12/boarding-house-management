import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Bill } from '../models/bill';

export interface GenerateResult {
  month: string;
  created: number;
}

@Injectable({ providedIn: 'root' })
export class BillService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:5262/api/bills';

  getAll(): Observable<Bill[]> {
    return this.http.get<Bill[]>(this.baseUrl);
  }

  generate(month: string): Observable<GenerateResult> {
    const params = new HttpParams().set('month', month);
    return this.http.post<GenerateResult>(`${this.baseUrl}/generate`, {}, { params });
  }

  pay(id: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/pay`, {});
  }
}