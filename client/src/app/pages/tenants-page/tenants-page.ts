import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TenantService, TenantPayload } from '../../services/tenant.service';
import { RoomService } from '../../services/room.service';
import { Tenant } from '../../models/tenant';
import { Room } from '../../models/room';
import { TenantCard } from '../../components/tenant-card/tenant-card';
import { TenantForm } from '../../components/tenant-form/tenant-form';

@Component({
  selector: 'app-tenants-page',
  imports: [TenantCard, TenantForm],
  templateUrl: './tenants-page.html',
  styleUrl: './tenants-page.css'
})
export class TenantsPage {
  private tenantService = inject(TenantService);
  private roomService = inject(RoomService);

  tenants = signal<Tenant[]>([]);
  rooms = signal<Room[]>([]);
  editing = signal<Tenant | null>(null);
  showForm = signal(false);
  error = signal('');

  constructor() {
    this.load();
  }

  load() {
    this.tenantService.getAll().subscribe({
      next: t => this.tenants.set(t),
      error: () => this.error.set('Hindi ma-load ang tenants. Tumatakbo ba ang API?')
    });
    this.roomService.getAll().subscribe({
      next: r => this.rooms.set(r),
      error: () => this.error.set('Hindi ma-load ang rooms. Tumatakbo ba ang API?')
    });
  }

  onAddClick() {
    this.error.set('');
    this.editing.set(null);
    this.showForm.set(true);
  }

  onEdit(tenant: Tenant) {
    this.error.set('');
    this.editing.set(tenant);
    this.showForm.set(true);
  }

  onCancel() {
    this.showForm.set(false);
    this.editing.set(null);
  }

  onSave(payload: TenantPayload) {
    this.error.set('');

    const done = {
      next: () => {
        this.onCancel();
        this.load();   // para updated din ang status ng rooms
      },
      error: (err: HttpErrorResponse) => this.error.set(this.messageFrom(err))
    };

    if (payload.id) {
      this.tenantService.update({ ...payload, id: payload.id }).subscribe(done);
    } else {
      this.tenantService.create(payload).subscribe(done);
    }
  }

  onMoveOut(id: number) {
    if (!confirm('Mag-move out na ba ang tenant na ito?')) return;
    this.tenantService.moveOut(id).subscribe(() => this.load());
  }

  private messageFrom(err: HttpErrorResponse): string {
    return typeof err.error === 'string' && err.error
      ? err.error
      : 'May error. Subukan ulit.';
  }
}
