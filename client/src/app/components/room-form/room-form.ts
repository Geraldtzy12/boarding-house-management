import { AfterViewInit, Component, computed, effect, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Room, RoomStatus, RoomType, ROOM_TYPES, roomImageUrl } from '../../models/room';

export type RoomDraft = Omit<Room, 'id'> & {
  id?: number;
  imageFile?: File | null;    // newly chosen photo (uploaded by the page after save)
  removeImage?: boolean;      // true = delete the uploaded photo
};

@Component({
  selector: 'app-room-form',
  imports: [FormsModule],
  templateUrl: './room-form.html',
  styleUrl: './room-form.css'
})
export class RoomForm implements AfterViewInit {
  room = input<Room | null>(null);   // null = Add, has a value = Edit
  error = input<string>('');   // from the page: duplicate room number error from the API
  saved = output<RoomDraft>();
  cancelled = output<void>();

  // Template reference variable (Week 3): the first field, focused when the form opens.
  firstField = viewChild<ElementRef<HTMLInputElement>>('firstField');

  roomNo = signal('');
  monthlyRate = signal(0);
  capacity = signal(1);
  status = signal<RoomStatus>('Vacant');
  type = signal<RoomType | ''>('');
  imageUrl = signal<string | null>(null);   // uploaded photo on the room being edited
  imageFile = signal<File | null>(null);    // newly chosen photo
  imagePreview = signal<string | null>(null); // preview of the newly chosen photo
  removeImage = signal(false);
  photoError = signal('');

  readonly roomTypes = ROOM_TYPES;

  // Photo shown in the form: newly chosen preview, else the saved photo, else the type photo.
  previewUrl = computed(() => {
    if (this.imagePreview()) return this.imagePreview();
    if (this.imageUrl()) return roomImageUrl({ type: this.type() || null, imageUrl: this.imageUrl() });
    return roomImageUrl({ type: this.type() || null, imageUrl: null });
  });

  canSave = computed(() =>
    this.roomNo().trim().length > 0 && this.monthlyRate() > 0 && this.capacity() >= 1
  );

  // Blur validation (Week 3: focus/blur): an error shows only after the user
  // leaves the field, so the form does not shout while they are still typing.
  roomNoTouched = signal(false);
  rateTouched = signal(false);
  capacityTouched = signal(false);

  roomNoError = computed(() =>
    this.roomNoTouched() && this.roomNo().trim().length === 0 ? 'Room number is required.' : '');
  rateError = computed(() =>
    this.rateTouched() && this.monthlyRate() <= 0 ? 'Monthly rate must be more than 0.' : '');
  capacityError = computed(() =>
    this.capacityTouched() && this.capacity() < 1 ? 'Capacity must be at least 1.' : '');

  ngAfterViewInit() {
    this.firstField()?.nativeElement.focus();
  }

  constructor() {
    // When the `room` input changes, refill the form
    effect(() => {
      const r = this.room();
      this.roomNo.set(r?.roomNo ?? '');
      this.monthlyRate.set(r?.monthlyRate ?? 0);
      this.capacity.set(r?.capacity ?? 1);
      this.status.set(r?.status ?? 'Vacant');
      this.type.set(r?.type ?? '');
      this.imageUrl.set(r?.imageUrl ?? null);
      this.imageFile.set(null);
      this.imagePreview.set(null);
      this.removeImage.set(false);
      this.photoError.set('');
      this.roomNoTouched.set(false);
      this.rateTouched.set(false);
      this.capacityTouched.set(false);
    });
  }

  onPhotoSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.photoError.set('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.photoError.set('Choose an image file (JPG, PNG or WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.photoError.set('Image must be 5 MB or smaller.');
      return;
    }
    this.imageFile.set(file);
    this.imagePreview.set(URL.createObjectURL(file));
    this.removeImage.set(false);
  }

  onRemovePhoto() {
    this.imageFile.set(null);
    this.imagePreview.set(null);
    this.imageUrl.set(null);
    this.removeImage.set(true);
  }

  submit() {
    if (!this.canSave()) return;
    this.saved.emit({
      id: this.room()?.id,
      roomNo: this.roomNo().trim(),
      monthlyRate: Number(this.monthlyRate()),
      capacity: Number(this.capacity()),
      status: this.status(),
      type: this.type() || null,
      imageUrl: this.imageUrl(),
      imageFile: this.imageFile(),
      removeImage: this.removeImage()
    });
  }
}
