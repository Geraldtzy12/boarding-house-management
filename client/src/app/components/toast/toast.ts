import { Component, effect, inject, input, OnDestroy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NotificationService } from '../../services/notification.service';

// Renders the toasts published through NotificationService (Week 5: the
// service is the event bus, this component is the subscriber). Lives once
// in App so a toast can be shown from any page.
@Component({
  selector: 'app-toast',
  imports: [],
  templateUrl: './toast.html',
  styleUrl: './toast.css'
})
export class Toast implements OnDestroy {
  private notification = inject(NotificationService);
  toasts = toSignal(this.notification.toasts$, { initialValue: [] });
  durationMs = input(4000);

  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  constructor() {
    // Auto-dismiss each new toast. The timers live here (not in the service),
    // so they can be cancelled when this component is destroyed (Week 4).
    effect(() => {
      for (const toast of this.toasts()) {
        if (!this.timers.has(toast.id)) {
          this.timers.set(toast.id, setTimeout(() => this.dismiss(toast.id), this.durationMs()));
        }
      }
    });
  }

  dismiss(id: number) {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.notification.dismiss(id);
  }

  ngOnDestroy() {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }
}
