import { Component, computed, input, output } from '@angular/core';
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
  tenantNames = input<string[]>([]);   // names of the active tenants renting this room
  edit = output<Room>();           // events UP
  remove = output<number>();

  // "2/4" — how many beds are taken
  occupancy = computed(() => `${this.tenantNames().length}/${this.room().capacity}`);

  // Uploaded photo if there is one, else the photo for the room's type.
  imageFor(room: Room): string {
    return roomImageUrl(room);
  }
}
