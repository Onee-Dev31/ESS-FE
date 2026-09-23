import { Requester } from './core.interface';

export interface RequestItem {
  date: string;
  description: string;
  amount: number;
  shiftCode?: string;
}

export interface AttendanceLog {
  date: string;
  dayType: string;
  timeIn: string;
  timeOut: string;
  selected: boolean;
  description: string;
  shiftCode: string;
}

export interface VehicleRequest {
  id: string;
  typeId: number;
  createDate: string;
  status: string;
  items: RequestItem[];
  requester?: Requester;
}

export interface VehicleApprovalStep {
  stepNo: number;
  approverEmpNo: string;
  approverName: string;
  status: string;
  actedBy: string | null;
  actedAt: string | null;
  remark: string | null;
}

export interface VehicleClaim {
  claimId: number;
  voucherNo: string;
  employeeCode: string;
  totalAmount: number;
  claimDate: string;
  status: string;
  approvals: VehicleApprovalStep[];
  details: any[];
}
