import { Component } from '@angular/core';
import { RoomsPage } from './pages/rooms-page/rooms-page';

@Component({
  selector: 'app-root',
  imports: [RoomsPage],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}