import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Tenant } from '../../models/tenant';
import { Room } from '../../models/room';
import { TenantPayload } from '../../services/tenant.service';
import { DatePicker } from '../date-picker/date-picker';

function today(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

@Component({
  selector: 'app-tenant-form',
  imports: [FormsModule, DatePicker],
  templateUrl: './tenant-form.html',
  styleUrl: './tenant-form.css'
})
export class TenantForm {
  tenant = input<Tenant | null>(null);   // null = Add, has a value = Edit
  rooms = input.required<Room[]>();
  error = input<string>('');   // from the page: duplicate / occupied error from the API
  saved = output<TenantPayload>();
  cancelled = output<void>();

  name = signal('');
  contact = signal('');
  roomId = signal<number | null>(null);
  leaseStart = signal(today());

  selectedRoom = computed(() =>
    this.rooms().find(r => r.id === this.roomId()) ?? null
  );

  // Occupied room, except the tenant's own room when editing
  selectedRoomOccupied = computed(() => {
    const r = this.selectedRoom();
    return r?.status === 'Occupied' && r.id !== this.tenant()?.roomId;
  });

  isRoomDisabled = (room: Room): boolean =>
    room.status === 'Occupied' && room.id !== this.tenant()?.roomId;

  // Contact is digits only (09XXXXXXXXX, 11 digits); the +63 is just shown on the field.
  contactDigits = computed(() => this.contact().replace(/\D/g, ''));

  contactError = computed(() => {
    const digits = this.contactDigits();
    if (digits.length === 0 || digits.length === 11) return '';
    return 'Contact number must be 11 digits.';
  });

  canSave = computed(() =>
    this.name().trim().length > 0 &&
    this.contactDigits().length === 11 &&
    this.leaseStart().length > 0 &&
    !this.selectedRoomOccupied()
  );

  constructor() {
    effect(() => {
      const t = this.tenant();
      this.name.set(t?.name ?? '');
      this.contact.set((t?.contact ?? '').replace(/\D/g, ''));
      this.roomId.set(t?.roomId ?? null);
      this.leaseStart.set(t?.leaseStart ?? today());
    });
  }

  onContactChanged(value: string) {
    this.contact.set(value.replace(/\D/g, ''));
  }

  submit() {
    if (!this.canSave()) return;
    this.saved.emit({
      id: this.tenant()?.id,
      name: this.name().trim(),
      contact: this.contactDigits(),
      roomId: this.roomId(),
      leaseStart: this.leaseStart()
    });
  }
}
