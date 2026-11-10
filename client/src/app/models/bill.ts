import { Tenant } from './tenant';

export type BillStatus = 'Pending' | 'Paid' | 'Overdue';
export type BillType = 'Rent' | 'Electricity' | 'Water' | 'Other';

export interface Bill {
  id: number;
  tenantId: number;
  tenant?: Tenant | null;
  roomNo: string;
  type: BillType;
  month: string;        // 'yyyy-MM'
  amount: number;
  dueDate: string;      // 'yyyy-MM-dd'
  status: BillStatus;
  paidOn: string | null;
  note: string | null;
}