import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// Event bus for toast notifications (Week 5: Subject + service).
// Any page can publish a toast; the Toast component (in App) subscribes and
// renders it. This service stays a pure publish/subscribe bus — the Toast
// component owns the auto-dismiss timers (Week 4: ngOnDestroy clears them).
export interface Toast {
  id: number;
  message: string;
  kind: 'success' | 'error';
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private nextId = 0;
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  toasts$ = this.toastsSubject.asObservable();

  success(message: string) {
    this.show(message, 'success');
  }

  error(message: string) {
    this.show(message, 'error');
  }

  dismiss(id: number) {
    this.toastsSubject.next(this.toastsSubject.value.filter(t => t.id !== id));
  }

  private show(message: string, kind: Toast['kind']) {
    const toast: Toast = { id: ++this.nextId, message, kind };
    this.toastsSubject.next([...this.toastsSubject.value, toast]);
  }
}
