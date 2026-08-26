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
  attachments: { file_id?: number; name: string; url?: string }[];
  days?: number;
  leavePeriod?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  approver1_code?: string | null;
  approver1_action?: string | null;
  approver1_comment?: string | null;
  approver1_reason?: string | null;
  approver2_code?: string | null;
  approver2_action?: string | null;
  approver2_comment?: string | null;
  approver2_reason?: string | null;
  overall_status?: string | null;
  requester?: Requester;
}

export interface LeaveApprovalFile {
  file_id: number;
  request_id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string;
  uploaded_at: string;
}

export interface LeaveApprovalRequest {
  request_id: number;
  leave_number: string;
  employee_code: string;
  employee_first_name?: string | null;
  employee_last_name?: string | null;
  employee_full_name?: string | null;
  employee_nickname?: string | null;
  employee_department?: string | null;
  employee_company_code?: string | null;
  employee_company_name?: string | null;
  leave_type_id: number;
  leave_code: string;
  leave_name_th: string;
  leave_name_en: string;
  year: string;
  start_date: string;
  end_date: string;
  total_days: number;
  is_half_day: boolean;
  half_day_period: string;
  reason: string;
  status: string;
  created_at: string;
  approver1_code: string;
  approver1_action: string | null;
  approver1_action_date: string | null;
  approver1_comment?: string | null;
  approver1_reason?: string | null;
  approver2_code: string | null;
  approver2_action: string | null;
  approver2_action_date: string | null;
  approver2_comment?: string | null;
  approver2_reason?: string | null;
  overall_status: string;
  MySlot: number;
  files: LeaveApprovalFile[];
}

export type LeaveApprovalAction = 'Approved' | 'Rejected' | 'Sendback';

export interface LeaveApprovalActionPayload {
  request_id: number;
  approver_code: string;
  status: LeaveApprovalAction;
  comment: string;
}

export type LeaveRequestAction = 'Upsert' | 'Resubmit' | 'Cancel';

export interface SaveLeaveRequestPayload {
  action?: LeaveRequestAction;
  request_id: number;
  leave_type_id?: number;
  start_date?: string;
  end_date?: string;
  total_days?: number;
  year?: number;
  reason?: string;
  is_half_day?: boolean;
  half_day_period?: string;
  delete_file_ids?: number[];
  files?: File[];
  request_by?: string;
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
