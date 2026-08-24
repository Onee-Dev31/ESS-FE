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

export interface LeaveQuotaRule {
  rule_id: number;
  leave_type_id: number;
  leave_code: string;
  leave_name_th: string;
  leave_name_en: string;
  jobclass_min: number;
  jobclass_max: number;
  service_year_min: number;
  service_year_max: number;
  quota_days: number;
  leave_type_is_active: boolean;
}

export interface LeaveTypeMaster {
  leave_type_id: number;
  leave_code: string;
  leave_name_th: string;
  leave_name_en: string;
}

export interface LeaveQuotaData {
  master: LeaveTypeMaster[];
  rules: LeaveQuotaRule[];
}

export interface UpsertLeaveQuotaRulePayload {
  rule_id?: number;
  leave_type_id: number;
  jobclass_min: number;
  jobclass_max: number;
  service_year_min: number;
  service_year_max: number;
  quota_days: number;
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
