import { Tenant } from './tenant';

export type BillStatus = 'Pending' | 'Paid' | 'Overdue';

export interface Bill {
  id: number;
  tenantId: number;
  tenant?: Tenant | null;
  roomNo: string;
  month: string;        // 'yyyy-MM'
  amount: number;
  dueDate: string;      // 'yyyy-MM-dd'
  status: BillStatus;
  paidOn: string | null;
}