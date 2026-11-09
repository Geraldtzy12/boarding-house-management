import { Room } from './room';

export interface Tenant {
  id: number;
  name: string;
  contact: string;
  roomId: number | null;
  room?: Room | null;
  leaseStart: string;   // 'yyyy-MM-dd'
  isActive: boolean;
}