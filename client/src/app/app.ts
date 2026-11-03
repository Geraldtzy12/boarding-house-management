import { Component, inject, signal } from '@angular/core';
import { RoomService } from './services/room.service';
import { Room } from './models/room';
import { RoomCard } from './components/room-card/room-card';

@Component({
  selector: 'app-root',
  imports: [RoomCard],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private roomService = inject(RoomService);
  rooms = signal<Room[]>([]);

  constructor() {
    this.roomService.getAll().subscribe(r => this.rooms.set(r));
  }

  onEdit(room: Room) { console.log('edit', room); }
  onRemove(id: number) { console.log('remove', id); }
}