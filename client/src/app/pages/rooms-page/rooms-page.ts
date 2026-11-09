import { Component, inject, signal } from '@angular/core';
import { RoomService } from '../../services/room.service';
import { Room } from '../../models/room';
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

  rooms = signal<Room[]>([]);          // single source of truth
  editing = signal<Room | null>(null);
  showForm = signal(false);
  error = signal('');

  constructor() {
    this.load();
  }

  load() {
    this.roomService.getAll().subscribe({
      next: r => this.rooms.set(r),
      error: () => this.error.set('Hindi ma-load ang rooms. Tumatakbo ba ang API?')
    });
  }

  onAddClick() {
    this.editing.set(null);
    this.showForm.set(true);
  }

  onEdit(room: Room) {
    this.editing.set(room);
    this.showForm.set(true);
  }

  onCancel() {
    this.showForm.set(false);
    this.editing.set(null);
  }

  onSave(draft: RoomDraft) {
    if (draft.id) {
      const room = draft as Room;
      this.roomService.update(room).subscribe(() => {
        this.rooms.update(list => list.map(r => (r.id === room.id ? room : r)));
        this.onCancel();
      });
    } else {
      this.roomService.create(draft).subscribe(created => {
        this.rooms.update(list => [...list, created]);   // bagong array, walang push()
        this.onCancel();
      });
    }
  }

  onRemove(id: number) {
    if (!confirm('I-delete ang room na ito?')) return;
    this.roomService.delete(id).subscribe(() => {
      this.rooms.update(list => list.filter(r => r.id !== id));
    });
  }
}