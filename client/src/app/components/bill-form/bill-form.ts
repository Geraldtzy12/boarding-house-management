import { AfterViewInit, Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tenant } from '../../models/tenant';
import { Room } from '../../models/room';
import { BillType } from '../../models/bill';
import { BillPayload } from '../../services/bill.service';
import { DatePicker } from '../date-picker/date-picker';
import { MonthPicker } from '../month-picker/month-picker';

// One row of the save result: created, or why it was not created.
export interface BillSaveResult {
  type: BillType;
  amount: number;
  ok: boolean;
  message: string;
}

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
  imports: [CurrencyPipe, FormsModule, DatePicker, MonthPicker],
  templateUrl: './bill-form.html',
  styleUrl: './bill-form.css'
})
export class BillForm implements AfterViewInit {
  rooms = input.required<Room[]>();      // data DOWN
  tenants = input.required<Tenant[]>();  // data DOWN
  error = input<string>('');   // from the page: duplicate bill error from the API
  result = input<BillSaveResult[] | null>(null);   // after saving: what was created, what was not
  saving = input(false);   // the page is creating the bills right now
  saved = output<BillPayload[]>();   // events UP: one payload per filled-in type
  cancelled = output<void>();

  // Template reference variable (Week 3): the first field, focused when the form opens.
  firstField = viewChild<ElementRef<HTMLSelectElement>>('firstField');

  // Rent first: it is the one tenants pay every month.
  types: BillType[] = ['Rent', 'Water', 'Electricity', 'Other'];

  roomId = signal<number | null>(null);
  tenantId = signal<number | null>(null);
  month = signal(currentMonth());
  dueDate = signal(today());
  note = signal('');

  // One amount per type; blank (0) means "no bill for this type".
  // Rent is filled in from the room rate — change it if the tenant pays
  // something else. Water and Electricity vary by meter reading, so the
  // admin types those in.
  amounts = signal<Record<BillType, number>>({ Rent: 0, Water: 0, Electricity: 0, Other: 0 });

  amountOf(type: BillType): number {
    return this.amounts()[type];
  }

  setAmount(type: BillType, value: number | null) {
    const amount = Math.max(0, Number(value) || 0);
    this.amounts.update(a => ({ ...a, [type]: amount }));
  }

  // Types with an amount typed in — those are the bills that will be created.
  filledTypes = computed(() => this.types.filter(t => this.amounts()[t] > 0));

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
  // automatically, so that's one less click. Rent follows the room (its
  // monthly rate) and the other amounts reset — they belong to the
  // previous tenant's meter readings, not the next one.
  onRoomChanged(roomId: number | null) {
    this.roomId.set(roomId);
    const tenants = this.roomTenants();
    this.tenantId.set(tenants.length === 1 ? tenants[0].id : null);
    const room = this.rooms().find(r => r.id === roomId);
    this.amounts.set({ Rent: room?.monthlyRate ?? 0, Water: 0, Electricity: 0, Other: 0 });
  }

  // Switching tenants keeps the rent (same room) but resets the metered
  // amounts — Water and Electricity belong to the previous tenant.
  onTenantChanged(tenantId: number | null) {
    this.tenantId.set(tenantId);
    this.amounts.update(a => ({ ...a, Water: 0, Electricity: 0, Other: 0 }));
  }

  canSave = computed(() =>
    this.tenantId() !== null &&
    this.filledTypes().length > 0 &&
    this.month().length > 0 &&
    this.dueDate().length > 0
  );

  // Blur validation (Week 3: focus/blur): errors show only after the user
  // leaves the field, so the form does not shout while they are still typing.
  roomTouched = signal(false);
  tenantTouched = signal(false);
  amountsTouched = signal(false);

  roomError = computed(() =>
    this.roomTouched() && this.roomId() === null ? 'Choose a room.' : '');
  tenantError = computed(() =>
    this.tenantTouched() && this.tenantId() === null ? 'Choose a tenant.' : '');
  amountsError = computed(() =>
    this.amountsTouched() && this.filledTypes().length === 0 ? 'Enter an amount for at least one bill.' : '');

  ngAfterViewInit() {
    this.firstField()?.nativeElement.focus();
  }

  submit() {
    if (!this.canSave()) return;
    this.saved.emit(this.filledTypes().map(type => ({
      tenantId: this.tenantId()!,
      type,
      month: this.month(),
      amount: this.amounts()[type],
      dueDate: this.dueDate(),
      note: this.note().trim() || null
    })));
  }
}
