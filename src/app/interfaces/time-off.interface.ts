import { Requester } from './core.interface';

export interface TimeOffRequest {
  id: string;
  request_id?: number;
  createDate: string;
  leave_number?: string;
  create_at?: string;
  status: string;
  employeeId: string;
  employee_code?: string;
  leaveType: string;
  leave_type_id?: number;
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

export type LeaveRequestAction = 'Upsert' | 'Resubmit' | 'Cancel';

export interface SaveLeaveRequestPayload {
  action?: LeaveRequestAction;
  request_id: number;
  employee_code: string;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  total_days: number;
  year: number;
  reason: string;
  is_half_day: boolean;
  half_day_period?: string;
  delete_file_ids?: number | number[];
  files?: File[];
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
  service_year_max: number | null;
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
  isDelete?: boolean;
  excuteBy?: string;
}

export interface LeaveType {
  id: string;
  label: string;
  icon: string;
  color: string;
  remaining?: number;
  code?: string;
}
