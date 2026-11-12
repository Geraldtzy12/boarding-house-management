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
        next: () => this.afterSave(room, draft),
        error: (err: HttpErrorResponse) => this.error.set(this.messageFrom(err))
      });
    } else {
      this.roomService.create(draft).subscribe({
        next: created => this.afterSave(created, draft),
        error: (err: HttpErrorResponse) => this.error.set(this.messageFrom(err))
      });
    }
  }

  // After the room itself is saved, upload a newly chosen photo
  // (or remove the old one), then refresh the list and close the form.
  private afterSave(room: Room, draft: RoomDraft) {
    const finish = (saved: Room) => {
      if (draft.id) {
        this.rooms.update(list => list.map(r => (r.id === saved.id ? saved : r)));
      } else {
        this.rooms.update(list => [...list, saved]);   // new array, no push()
      }
      this.onCancel();
    };

    if (draft.imageFile) {
      this.roomService.uploadImage(room.id, draft.imageFile).subscribe({
        next: r => finish({ ...room, imageUrl: r.imageUrl }),
        error: (err: HttpErrorResponse) => {
          // The room was saved; only the photo failed.
          this.error.set(this.messageFrom(err));
          finish(room);
        }
      });
    } else if (draft.removeImage) {
      this.roomService.removeImage(room.id).subscribe({
        next: () => finish({ ...room, imageUrl: null }),
        error: (err: HttpErrorResponse) => {
          this.error.set(this.messageFrom(err));
          finish(room);
        }
      });
    } else {
      finish(room);
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
