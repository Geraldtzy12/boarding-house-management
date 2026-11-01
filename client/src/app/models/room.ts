export type RoomStatus = 'Vacant' | 'Occupied';

export interface Room {
  id: number;
  roomNo: string;
  monthlyRate: number;
  capacity: number;
  status: RoomStatus;
}