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
