import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BackupService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:5262/api/backup';

  downloadDatabase(): Observable<HttpResponse<Blob>> {
    return this.download(`${this.baseUrl}/database`, 'boardinghouse-backup.db');
  }

  exportBills(): Observable<HttpResponse<Blob>> {
    return this.download(`${this.baseUrl}/bills.csv`, 'bills.csv');
  }

  exportTenants(): Observable<HttpResponse<Blob>> {
    return this.download(`${this.baseUrl}/tenants.csv`, 'tenants.csv');
  }

  // GETs the file as a blob, then triggers the browser download with the
  // filename the API sent (Content-Disposition) or the fallback name.
  private download(url: string, fallbackName: string): Observable<HttpResponse<Blob>> {
    return this.http.get(url, { observe: 'response', responseType: 'blob' }).pipe(
      tap(response => {
        const blob = response.body;
        if (!blob) return;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileNameFrom(response) ?? fallbackName;
        link.click();
        URL.revokeObjectURL(link.href);
      })
    );
  }
}

function fileNameFrom(response: HttpResponse<Blob>): string | null {
  const disposition = response.headers.get('Content-Disposition');
  if (!disposition) return null;
  const star = /filename\*=UTF-8''([^;\s]+)/.exec(disposition);
  if (star) return decodeURIComponent(star[1]);
  const plain = /filename="?([^";]+)"?/.exec(disposition);
  return plain ? plain[1] : null;
}
