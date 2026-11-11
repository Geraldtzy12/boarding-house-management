export interface OverdueBill {
  id: number;
  tenantName: string;
  roomNo: string;
  type: string;
  amount: number;
  dueDate: string;      // 'yyyy-MM-dd'
}

export interface VacantRoom {
  id: number;
  roomNo: string;
  monthlyRate: number;
  capacity: number;
}

export interface RecentPayment {
  id: number;
  tenantName: string;
  roomNo: string;
  type: string;
  amount: number;
  paidOn: string;       // 'yyyy-MM-dd'
}

export interface DashboardSummary {
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  activeTenants: number;
  collectedThisMonth: number;
  toCollect: number;
  overdueCount: number;
  overdueAmount: number;
  overdueBills: OverdueBill[];
  vacantRoomList: VacantRoom[];
  recentPayments: RecentPayment[];
}

export interface MonthlyCollection {
  month: string;      // 'yyyy-MM'
  collected: number;
}
