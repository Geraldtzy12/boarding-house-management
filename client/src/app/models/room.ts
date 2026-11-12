export type RoomStatus = 'Vacant' | 'Occupied';

export type RoomType = 'Single' | 'Double-deck' | 'Studio' | 'Bed Spacer';

export const ROOM_TYPES: RoomType[] = ['Single', 'Double-deck', 'Studio', 'Bed Spacer'];

export interface Room {
  id: number;
  roomNo: string;
  monthlyRate: number;
  capacity: number;
  status: RoomStatus;
  type?: RoomType | null;        // null = not set yet
  imageUrl?: string | null;      // uploaded photo ('/uploads/rooms/...'), null = use the type photo
}

// One default photo per room type, in client/public/rooms/.
// An uploaded photo (room.imageUrl) always wins over the type photo.
const TYPE_IMAGES: Record<RoomType, string> = {
  'Single': 'rooms/single.webp',
  'Double-deck': 'rooms/double-deck.webp',
  'Studio': 'rooms/studio.webp',
  'Bed Spacer': 'rooms/bed-spacer.webp',
};

const API_URL = 'http://localhost:5262';

export function roomImageUrl(room: { type?: string | null; imageUrl?: string | null }): string {
  if (room.imageUrl) {
    return room.imageUrl.startsWith('http') ? room.imageUrl : `${API_URL}${room.imageUrl}`;
  }
  if (room.type && room.type in TYPE_IMAGES) return TYPE_IMAGES[room.type as RoomType];
  return TYPE_IMAGES['Single'];
}
