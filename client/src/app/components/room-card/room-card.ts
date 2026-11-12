import { Component, input, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Room, roomImageUrl } from '../../models/room';

@Component({
  selector: 'app-room-card',
  imports: [CurrencyPipe],
  templateUrl: './room-card.html',
  styleUrl: './room-card.css'
})
export class RoomCard {
  room = input.required<Room>();   // data DOWN
  tenantName = input<string | null>(null);   // name of the tenant renting this room
  edit = output<Room>();           // events UP
  remove = output<number>();

  // Uploaded photo if there is one, else the photo for the room's type.
  imageFor(room: Room): string {
    return roomImageUrl(room);
  }
}
