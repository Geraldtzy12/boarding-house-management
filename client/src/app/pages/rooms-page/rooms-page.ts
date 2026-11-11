import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RoomService } from '../../services/room.service';
import { TenantService } from '../../services/tenant.service';
import { Room } from '../../models/room';
import { Tenant } from '../../models/tenant';
import { RoomCard } from '../../components/room-card/room-card';
import { RoomForm, RoomDraft } from '../../components/room-form/room-form';

@Component({
  selector: 'app-rooms-page',
  imports: [RoomCard, RoomForm],
  templateUrl: './rooms-page.html',
  styleUrl: './rooms-page.css'
})
export class RoomsPage {
  private roomService = inject(RoomService);
  private tenantService = inject(TenantService);

  rooms = signal<Room[]>([]);          // single source of truth
  tenants = signal<Tenant[]>([]);
  editing = signal<Room | null>(null);
  showForm = signal(false);
  error = signal('');

  // active tenant names per room, so each card can show who rents it
  tenantByRoom = computed(() => {
    const map = new Map<number, string[]>();
    for (const t of this.tenants()) {
      if (t.roomId === null || !t.isActive) continue;
      const names = map.get(t.roomId) ?? [];
      names.push(t.name);
      map.set(t.roomId, names);
    }
    return map;
  });

  tenantNameFor(roomId: number): string | null {
    const names = this.tenantByRoom().get(roomId);
    return names?.length ? names.join(', ') : null;
  }

  constructor() {
    this.load();
  }

  load() {
    this.roomService.getAll().subscribe({
      next: r => this.rooms.set(r),
      error: () => this.error.set('Could not load the rooms. Is the API running?')
    });
    this.tenantService.getAll().subscribe({
      next: t => this.tenants.set(t),
      error: () => this.error.set('Could not load the tenants. Is the API running?')
    });
  }

  onAddClick() {
    this.error.set('');
    this.editing.set(null);
    this.showForm.set(true);
  }

  onEdit(room: Room) {
    this.error.set('');
    this.editing.set(room);
    this.showForm.set(true);
  }

  onCancel() {
    this.showForm.set(false);
    this.editing.set(null);
  }

  onSave(draft: RoomDraft) {
    this.error.set('');

    if (draft.id) {
      const room = draft as Room;
      this.roomService.update(room).subscribe({
        next: () => {
          this.rooms.update(list => list.map(r => (r.id === room.id ? room : r)));
          this.onCancel();
        },
        error: (err: HttpErrorResponse) => this.error.set(this.messageFrom(err))
      });
    } else {
      this.roomService.create(draft).subscribe({
        next: created => {
          this.rooms.update(list => [...list, created]);   // new array, no push()
          this.onCancel();
        },
        error: (err: HttpErrorResponse) => this.error.set(this.messageFrom(err))
      });
    }
  }

  onRemove(id: number) {
    if (!confirm('Delete this room?')) return;
    this.error.set('');
    this.roomService.delete(id).subscribe({
      next: () => {
        this.rooms.update(list => list.filter(r => r.id !== id));
      },
      error: (err: HttpErrorResponse) => this.error.set(this.messageFrom(err))
    });
  }

  private messageFrom(err: HttpErrorResponse): string {
    return typeof err.error === 'string' && err.error
      ? err.error
      : 'Something went wrong. Please try again.';
  }
}
