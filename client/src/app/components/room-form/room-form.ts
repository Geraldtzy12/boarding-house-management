import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Room, RoomStatus } from '../../models/room';

export type RoomDraft = Omit<Room, 'id'> & { id?: number };

@Component({
  selector: 'app-room-form',
  imports: [FormsModule],
  templateUrl: './room-form.html',
  styleUrl: './room-form.css'
})
export class RoomForm {
  room = input<Room | null>(null);   // null = Add, may laman = Edit
  saved = output<RoomDraft>();
  cancelled = output<void>();

  roomNo = signal('');
  monthlyRate = signal(0);
  capacity = signal(1);
  status = signal<RoomStatus>('Vacant');

  canSave = computed(() =>
    this.roomNo().trim().length > 0 && this.monthlyRate() > 0 && this.capacity() >= 1
  );

  constructor() {
    // Kapag nagbago ang input na `room`, i-fill ulit ang form
    effect(() => {
      const r = this.room();
      this.roomNo.set(r?.roomNo ?? '');
      this.monthlyRate.set(r?.monthlyRate ?? 0);
      this.capacity.set(r?.capacity ?? 1);
      this.status.set(r?.status ?? 'Vacant');
    });
  }

  submit() {
    this.saved.emit({
      id: this.room()?.id,
      roomNo: this.roomNo().trim(),
      monthlyRate: Number(this.monthlyRate()),
      capacity: Number(this.capacity()),
      status: this.status()
    });
  }
}