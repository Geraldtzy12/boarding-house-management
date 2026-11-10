import { Component, input, output } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Bill } from '../../models/bill';

@Component({
  selector: 'app-bill-card',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './bill-card.html',
  styleUrl: './bill-card.css'
})
export class BillCard {
  bill = input.required<Bill>();   // data DOWN
  pay = output<number>();          // event UP
}