import { Component, input, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Room } from '../../models/room';

@Component({
  selector: 'app-room-card',
  imports: [CurrencyPipe],
  templateUrl: './room-card.html',
  styleUrl: './room-card.css'
})
export class RoomCard {
  room = input.required<Room>();   // data DOWN
  edit = output<Room>();           // events UP
  remove = output<number>();
}