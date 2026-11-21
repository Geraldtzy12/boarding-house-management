import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, map, Subject } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { TenantService, TenantPayload } from '../../services/tenant.service';
import { RoomService } from '../../services/room.service';
import { Tenant } from '../../models/tenant';
import { Room } from '../../models/room';
import { TenantCard } from '../../components/tenant-card/tenant-card';
import { TenantForm } from '../../components/tenant-form/tenant-form';

@Component({
  selector: 'app-tenants-page',
  imports: [TenantCard, TenantForm],
  templateUrl: './tenants-page.html',
  styleUrl: './tenants-page.css'
})
export class TenantsPage {
  private tenantService = inject(TenantService);
  private roomService = inject(RoomService);

  tenants = signal<Tenant[]>([]);
  rooms = signal<Room[]>([]);
  editing = signal<Tenant | null>(null);
  showForm = signal(false);
  error = signal('');

  // Search, same pattern as the Bills page (Week 5): keystrokes become a
  // stream, debounced 250 ms so the list only filters when the user pauses.
  private searchTerms$ = new Subject<string>();
  search = toSignal(
    this.searchTerms$.pipe(
      map(term => term.trim().toLowerCase()),
      debounceTime(250),
      distinctUntilChanged()
    ),
    { initialValue: '' }
  );

  // A tenant matches by name, contact number, or their room number —
  // e.g. typing "kim" shows Kim, typing "103" shows everyone in Room 103.
  filteredTenants = computed(() => {
    const q = this.search();
    if (q === '') return this.tenants();
    return this.tenants().filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.contact.includes(q) ||
      this.roomNoFor(t.roomId).toLowerCase().includes(q)
    );
  });

  roomNoFor(roomId: number | null): string {
    if (roomId === null) return '';
    return this.rooms().find(r => r.id === roomId)?.roomNo ?? '';
  }

  // Active tenants per room, as { roomId: count } — the form disables only full rooms.
  roomOccupancy = computed(() => {
    const counts: Record<number, number> = {};
    for (const t of this.tenants()) {
      if (t.roomId === null || !t.isActive) continue;
      counts[t.roomId] = (counts[t.roomId] ?? 0) + 1;
    }
    return counts;
  });

  constructor() {
    this.load();
  }

  load() {
    this.tenantService.getAll().subscribe({
      next: t => this.tenants.set(t),
      error: () => this.error.set('Hindi ma-load ang tenants. Tumatakbo ba ang API?')
    });
    this.roomService.getAll().subscribe({
      next: r => this.rooms.set(r),
      error: () => this.error.set('Hindi ma-load ang rooms. Tumatakbo ba ang API?')
    });
  }

  onSearch(event: Event) {
    this.searchTerms$.next((event.target as HTMLInputElement).value);
  }

  onAddClick() {
    this.error.set('');
    this.editing.set(null);
    this.showForm.set(true);
  }

  onEdit(tenant: Tenant) {
    this.error.set('');
    this.editing.set(tenant);
    this.showForm.set(true);
  }

  onCancel() {
    this.showForm.set(false);
    this.editing.set(null);
  }
// Escape closes the open form, wherever the focus is (Week 3: global listener).
@HostListener('document:keydown.escape')
onEscape() {
  if (this.showForm()) this.onCancel();
}

  onSave(payload: TenantPayload) {
    this.error.set('');

    const done = {
      next: () => {
        this.onCancel();
        this.load();   // para updated din ang status ng rooms
      },
      error: (err: HttpErrorResponse) => this.error.set(this.messageFrom(err))
    };

    if (payload.id) {
      this.tenantService.update({ ...payload, id: payload.id }).subscribe(done);
    } else {
      this.tenantService.create(payload).subscribe(done);
    }
  }

  onMoveOut(id: number) {
    if (!confirm('Mag-move out na ba ang tenant na ito?')) return;
    this.tenantService.moveOut(id).subscribe(() => this.load());
  }

  // Show the server's message only for 4xx answers. For anything else
  // (e.g. a 500) the server text can be a stack trace, so show a generic
  // message instead.
  private messageFrom(err: HttpErrorResponse): string {
    return err.status >= 400 && err.status < 500 && typeof err.error === 'string' && err.error
      ? err.error
      : 'May error. Subukan ulit.';
  }
}
