import { AfterViewInit, Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Tenant } from '../../models/tenant';
import { Room } from '../../models/room';
import { BillType } from '../../models/bill';
import { BillPayload } from '../../services/bill.service';
import { DatePicker } from '../date-picker/date-picker';
import { MonthPicker } from '../month-picker/month-picker';


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
  imports: [FormsModule, DatePicker, MonthPicker],
  templateUrl: './bill-form.html',
  styleUrl: './bill-form.css'
})
export class BillForm implements AfterViewInit {
  rooms = input.required<Room[]>();      // data DOWN
  tenants = input.required<Tenant[]>();  // data DOWN
  saved = output<BillPayload>();         // events UP
  cancelled = output<void>();

  // Template reference variable (Week 3): the first field, focused when the form opens.
  firstField = viewChild<ElementRef<HTMLSelectElement>>('firstField');

  types: BillType[] = ['Electricity', 'Water', 'Rent', 'Other'];

  roomId = signal<number | null>(null);
  tenantId = signal<number | null>(null);
  type = signal<BillType>('Electricity');
  month = signal(currentMonth());
  amount = signal(0);
  dueDate = signal(today());
  note = signal('');

  // Rooms in number order, so the dropdown is easy to scan.
  sortedRooms = computed(() =>
    [...this.rooms()].sort((a, b) => a.roomNo.localeCompare(b.roomNo)));

  // Only the active tenants of the chosen room — pick a room first,
  // then the names in it (much shorter than the whole tenant list).
  roomTenants = computed(() => {
    const roomId = this.roomId();
    if (roomId === null) return [];
    return this.tenants().filter(t => t.roomId === roomId && t.isActive);
  });

  // Picking a room resets the tenant; a room with one tenant picks them
  // automatically, so that's one less click.
  onRoomChanged(roomId: number | null) {
    this.roomId.set(roomId);
    const tenants = this.roomTenants();
    this.tenantId.set(tenants.length === 1 ? tenants[0].id : null);
  }

  canSave = computed(() =>
    this.tenantId() !== null &&
    this.amount() > 0 &&
    this.month().length > 0 &&
    this.dueDate().length > 0
  );

  // Blur validation (Week 3: focus/blur): errors show only after the user
  // leaves the field, so the form does not shout while they are still typing.
  roomTouched = signal(false);
  tenantTouched = signal(false);
  amountTouched = signal(false);

  roomError = computed(() =>
    this.roomTouched() && this.roomId() === null ? 'Choose a room.' : '');
  tenantError = computed(() =>
    this.tenantTouched() && this.tenantId() === null ? 'Choose a tenant.' : '');
  amountError = computed(() =>
    this.amountTouched() && this.amount() <= 0 ? 'Amount must be more than 0.' : '');

  ngAfterViewInit() {
    this.firstField()?.nativeElement.focus();
  }

  submit() {
    if (!this.canSave()) return;
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
