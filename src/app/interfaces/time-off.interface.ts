import { Requester } from './core.interface';

export interface TimeOffEmployee {
  employee_code: string;
  employee_first_name: string;
  employee_last_name: string;
  employee_nickname: string;
  job_grade: string;
  start_work_date: string;
  service_year: number;
  shift_code: string;
  start_time: string;
  end_time: string;
  is_night_shift: boolean;
}

export interface EmployeeLeaveQuota {
  leave_type_id: number;
  leave_code: string;
  leave_name_th: string;
  leave_name_en: string;
  job_grade: number;
  service_year: number;
  rule_id: number;
  jobclass_min: number;
  jobclass_max: number;
  service_year_min: number;
  service_year_max: number | null;
  quota_total_days: number;
  quota_used_days: number;
  quota_remaining_days: number;
  quota_max_times: number | null;
  quota_used_times: number;
  quota_remaining_times: number | null;
  max_days_per_event: number | null;
  min_half_day: boolean;
  is_paid: boolean;
  paid_days_limit: number | null;
  advance_notice_days: number;
  require_medical_cert: boolean;
  medical_cert_after_days: number | null;
}

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
  leaveType_icon?: string;
  leaveType_color?: string;
  startDate: string;
  endDate: string;
  reason: string;
  attachments: {
    file_id?: number;
    name: string;
    url?: string;
    type?: string;
    remark?: string;
    uploaded_at?: string;
  }[];
  days?: number;
  leavePeriod?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  isNightShift?: boolean;
  employee?: TimeOffEmployee;
  quotas?: EmployeeLeaveQuota[];
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
  file_remarks?: string[];
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

export interface EmployeeLeaveSummary {
  leave_type_id: number;
  leave_code: string;
  leave_name_th: string;
  leave_name_en: string;
  quota_type: string;
  icon_name: string;
  color_hex: string;
  is_paid: boolean;
  paid_days_limit: number | null;
  carry_forward: boolean;
  advance_notice_days: number;
  require_medical_cert: boolean;
  medical_cert_after_days: number | null;
  include_holiday: boolean;
  min_service_years: number | null;
  gender_restriction: string | null;
  max_times_per_year: number | null;
  max_times_per_career: number | null;
  quota_days: number | null;
  used_days: number | null;
  reserved_days: number | null;
  committed_days: number | null;
  remaining_days: number | null;
  available_days: number | null;
  once_career_used: boolean | null;
  service_year_eligible: number | boolean;
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
  available?: number;
  serviceYearEligible?: boolean;
  minServiceYears?: number;
  maxTimesPerCareer?: number;
  code?: string;
}
