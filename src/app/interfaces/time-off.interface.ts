import { Requester } from './core.interface';

export interface TimeOffRequest {
  id: string;
  createDate: string;
  status: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  attachments: { name: string; url?: string }[];
  days?: number;
  leavePeriod?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  requester?: Requester;
}

export interface LeaveType {
  id: string;
  label: string;
  icon: string;
  color: string;
  remaining: number;
}

export const LEAVE_TYPES: LeaveType[] = [
  {
    id: 'vacation',
    label: 'ลาพักร้อน',
    icon: 'fas fa-plane-departure',
    color: 'var(--danger)',
    remaining: 10,
  },
  {
    id: 'personal',
    label: 'ลากิจ',
    icon: 'fas fa-briefcase',
    color: 'var(--primary)',
    remaining: 6,
  },
  {
    id: 'sick',
    label: 'ลาป่วย',
    icon: 'fas fa-stethoscope',
    color: 'var(--primary)',
    remaining: 30,
  },
  {
    id: 'sterilization',
    label: 'ลาทำหมัน',
    icon: 'fas fa-user-md',
    color: 'var(--warning)',
    remaining: 1,
  },
  {
    id: 'funeral',
    label: 'ลาเพื่อจัดการงานศพ',
    icon: 'fas fa-ribbon',
    color: 'var(--success)',
    remaining: 5,
  },
];
