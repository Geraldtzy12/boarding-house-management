import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Tenant } from '../../models/tenant';
import { BillType } from '../../models/bill';
import { BillPayload } from '../../services/bill.service';

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function today(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

@Component({
  selector: 'app-bill-form',
  imports: [FormsModule],
  templateUrl: './bill-form.html',
  styleUrl: './bill-form.css'
})
export class BillForm {
  tenants = input.required<Tenant[]>();   // data DOWN
  saved = output<BillPayload>();          // events UP
  cancelled = output<void>();

  types: BillType[] = ['Electricity', 'Water', 'Rent', 'Other'];

  tenantId = signal<number | null>(null);
  type = signal<BillType>('Electricity');
  month = signal(currentMonth());
  amount = signal(0);
  dueDate = signal(today());
  note = signal('');

  canSave = computed(() =>
    this.tenantId() !== null &&
    this.amount() > 0 &&
    this.month().length > 0 &&
    this.dueDate().length > 0
  );

  submit() {
    this.saved.emit({
      tenantId: this.tenantId()!,
      type: this.type(),
      month: this.month(),
      amount: Number(this.amount()),
      dueDate: this.dueDate(),
      note: this.note().trim() || null
    });
  }
}