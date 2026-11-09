import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Tenant } from '../../models/tenant';

@Component({
  selector: 'app-tenant-card',
  imports: [DatePipe],
  templateUrl: './tenant-card.html',
  styleUrl: './tenant-card.css'
})
export class TenantCard {
  tenant = input.required<Tenant>();   // data DOWN
  edit = output<Tenant>();             // events UP
  moveOut = output<number>();
}