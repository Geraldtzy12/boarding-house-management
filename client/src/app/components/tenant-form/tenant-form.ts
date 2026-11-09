import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Tenant } from '../../models/tenant';
import { Room } from '../../models/room';
import { TenantPayload } from '../../services/tenant.service';

function today(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

@Component({
  selector: 'app-tenant-form',
  imports: [FormsModule],
  templateUrl: './tenant-form.html',
  styleUrl: './tenant-form.css'
})
export class TenantForm {
  tenant = input<Tenant | null>(null);   // null = Add, may laman = Edit
  rooms = input.required<Room[]>();
  saved = output<TenantPayload>();
  cancelled = output<void>();

  name = signal('');
  contact = signal('');
  roomId = signal<number | null>(null);
  leaseStart = signal(today());

  canSave = computed(() =>
    this.name().trim().length > 0 &&
    this.contact().trim().length > 0 &&
    this.leaseStart().length > 0
  );

  constructor() {
    effect(() => {
      const t = this.tenant();
      this.name.set(t?.name ?? '');
      this.contact.set(t?.contact ?? '');
      this.roomId.set(t?.roomId ?? null);
      this.leaseStart.set(t?.leaseStart ?? today());
    });
  }

  submit() {
    this.saved.emit({
      id: this.tenant()?.id,
      name: this.name().trim(),
      contact: this.contact().trim(),
      roomId: this.roomId(),
      leaseStart: this.leaseStart()
    });
  }
}