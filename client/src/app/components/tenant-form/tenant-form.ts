import { AfterViewInit, Component, computed, effect, ElementRef, input, output, signal, viewChild } from '@angular/core';
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
export class TenantForm implements AfterViewInit {
  tenant = input<Tenant | null>(null);   // null = Add, has a value = Edit
  rooms = input.required<Room[]>();
  // Active tenants per room, as { roomId: count } — from the page, which loads the tenants.
  roomOccupancy = input<Record<number, number>>({});
  error = input<string>('');   // from the page: duplicate / full-room error from the API
  saved = output<TenantPayload>();
  cancelled = output<void>();

  // Template reference variable (Week 3): the first field, focused when the form opens.
  firstField = viewChild<ElementRef<HTMLInputElement>>('firstField');

  name = signal('');
  contact = signal('');
  roomId = signal<number | null>(null);
  leaseStart = signal(today());

  selectedRoom = computed(() =>
    this.rooms().find(r => r.id === this.roomId()) ?? null
  );

  // A room is full when its beds are taken — except the tenant's own room
  // when editing, which still has their bed in it.
  isRoomFull = (room: Room): boolean => {
    const occupants = this.roomOccupancy()[room.id] ?? 0;
    const ownBed = this.tenant()?.roomId === room.id ? 1 : 0;
    return occupants - ownBed >= room.capacity;
  };

  occupancyOf = (room: Room): number => this.roomOccupancy()[room.id] ?? 0;

  // Full room, except the tenant's own room when editing
  selectedRoomFull = computed(() => {
    const r = this.selectedRoom();
    return r ? this.isRoomFull(r) : false;
  });

  // Contact is digits only (09XXXXXXXXX, 11 digits); the +63 is just shown on the field.
  contactDigits = computed(() => this.contact().replace(/\D/g, ''));

  contactError = computed(() => {
    const digits = this.contactDigits();
    if (digits.length === 0 || digits.length === 11) return '';
    return 'Contact number must be 11 digits.';
  });

  // Blur validation (Week 3: focus/blur): errors show only after the user
  // leaves the field, so the form does not shout while they are still typing.
  // The contact error itself stays live-computed; only its display is gated.
  nameTouched = signal(false);
  contactTouched = signal(false);

  nameError = computed(() =>
    this.nameTouched() && this.name().trim().length === 0 ? 'Name is required.' : '');

  ngAfterViewInit() {
    this.firstField()?.nativeElement.focus();
  }

  canSave = computed(() =>
    this.name().trim().length > 0 &&
    this.contactDigits().length === 11 &&
    this.leaseStart().length > 0 &&
    !this.selectedRoomFull()
  );

  constructor() {
    effect(() => {
      const t = this.tenant();
      this.name.set(t?.name ?? '');
      this.contact.set((t?.contact ?? '').replace(/\D/g, ''));
      this.roomId.set(t?.roomId ?? null);
      this.leaseStart.set(t?.leaseStart ?? today());
      this.nameTouched.set(false);
      this.contactTouched.set(false);
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
