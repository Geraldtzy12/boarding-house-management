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

  // What the user types after the +63 prefix: 10 digits starting with 9
  // (9309004530). The +63 stands for the 0, so the 0 is added back on save
  // and the stored number stays the 11-digit 09XXXXXXXXX the API expects.
  contactDigits = computed(() => this.contact().replace(/\D/g, ''));

  // 10 digits starting with 9 — anything else (too short, too long, or not
  // starting with 9, like 21312312312) is an error.
  contactValid = computed(() => {
    const digits = this.contactDigits();
    return digits.length === 10 && digits.startsWith('9');
  });

  contactError = computed(() => {
    const digits = this.contactDigits();
    if (digits.length === 0 || this.contactValid()) return '';
    return 'Contact number must be 10 digits starting with 9.';
  });

  // Blur validation (Week 3: focus/blur): errors show only after the user
  // leaves the field, so the form does not shout while they are still typing.
  // The contact error itself stays live-computed; only its display is gated.
  nameTouched = signal(false);
  contactTouched = signal(false);

  // The name is letters only: letters, spaces, hyphens and apostrophes
  // ("Juan Dela Cruz", "Anne-Marie", "D'Angelo"). Numbers and symbols
  // ("1233123123", "Kim123", "Angelica )*") are not allowed.
  nameValid = computed(() => {
    const name = this.name().trim();
    return name.length > 0 && /[A-Za-z]/.test(name) && !/[^A-Za-z '\-]/.test(name);
  });

  nameError = computed(() => {
    if (!this.nameTouched()) return '';
    const name = this.name().trim();
    if (name.length === 0) return 'Name is required.';
    if (!this.nameValid()) return 'Name must contain letters only.';
    return '';
  });

  ngAfterViewInit() {
    this.firstField()?.nativeElement.focus();
  }

  canSave = computed(() =>
    this.nameValid() &&
    this.contactValid() &&
    this.leaseStart().length > 0 &&
    !this.selectedRoomFull()
  );

  constructor() {
    effect(() => {
      const t = this.tenant();
      this.name.set(t?.name ?? '');
      // Stored numbers are 09…; the form shows them without the 0,
      // because the +63 prefix already stands for it.
      this.contact.set((t?.contact ?? '').replace(/\D/g, '').replace(/^0/, ''));
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
      // The +63 stands for the 0: add it back so the saved number is the
      // 11-digit 09XXXXXXXXX the API and the saved data expect.
      contact: '0' + this.contactDigits(),
      roomId: this.roomId(),
      leaseStart: this.leaseStart()
    });
  }
}