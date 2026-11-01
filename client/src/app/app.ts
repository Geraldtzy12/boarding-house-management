import { Component, inject, signal } from '@angular/core';
import { RoomService } from './services/room.service';
import { Room } from './models/room';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private roomService = inject(RoomService);
  rooms = signal<Room[]>([]);

  constructor() {
    this.roomService.getAll().subscribe(r => this.rooms.set(r));
  }
}