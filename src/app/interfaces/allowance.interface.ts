import { Requester } from './core.interface';

export interface AllowanceItem {
  date: string;
  dayType?: string;
  timeIn: string;
  timeOut: string;
  description: string;
  hours: number;
  amount: number;
  selected: boolean;
  shiftCode?: string;
  displayHours?: string;
  actualExtraHours?: number;
  isEligible?: boolean;
  totalHoursText?: string;
  rateId?: number | null;
}

export interface AllowanceRequest {
  id: string;
  typeId: number;
  createDate: string;
  status: string;
  items: AllowanceItem[];
  requester?: Requester;
}

// ─── Eligible Dates ──────────────────────────────────────────────────────────

export interface EligibleDate {
  employee_code: string;
  work_date: string; // ISO: "2026-03-02T00:00:00"
  actual_checkin: string; // HH:mm
  actual_checkout: string; // HH:mm
  scheduled_start: string; // HH:mm
  scheduled_end: string; // HH:mm
  day_type: string; // 'W' = workday, 'H' = holiday, 'T' = ทำงาน
  shift_code: string;
  is_fallback_day_type: number;
  is_fallback_schedule: number;
  actual_hours: number;
  total_hours: number;
  total_hours_text: string; // "3 ชั่วโมง 5 นาที"
  rounded_hours: number;
  rate_id: number | null;
  rate_amount: number | null;
  is_eligible: number; // 1 = eligible, 0 = not eligible
}

export interface EligibleDatesResponse {
  success: boolean;
  data: EligibleDate[];
}

// ─── Meal Allowance Rate ─────────────────────────────────────────────────────

export interface MealAllowanceRate {
  rate_id: number;
  min_hours: number;
  max_hours: number;
  rate_amount: number;
  description: string;
  created_at: string;
}

export interface MealAllowanceRatesResponse {
  success: boolean;
  data: MealAllowanceRate[];
}

// ─── Create Claim ─────────────────────────────────────────────────────────────

export interface CreateClaimDetail {
  work_date: string; // "YYYY-MM-DD"
  shift_code?: string;
  day_type?: string;
  actual_checkin?: string; // "HH:mm"
  actual_checkout?: string;
  extra_hours?: number;
  rate_id?: number | null;
  rate_amount: number;
  description?: string;
}

export interface CreateClaimRequest {
  employee_code: string;
  details: CreateClaimDetail[];
}

export interface CreateClaimResult {
  claimId: number;
  voucherNo: string;
  totalAmount: number;
  status: string;
  claimStatus: string;
}

export interface CreateClaimResponse {
  success: boolean;
  data: CreateClaimResult;
}

// ─── Meal Allowance API interfaces ───────────────────────────────────────────

export interface MealAllowanceApprovalStep {
  stepNo: number;
  approverEmpNo: string;
  approverName: string | null;
  status: string; // pending | approved | rejected | cancelled
  actedBy?: string | null; // empNo ของคนที่กด action จริง (อาจต่างจาก approverEmpNo ใน parallel)
  actedAt?: string | null;
  remark?: string | null;
  rejectionReason?: string | null;
}

export interface MealAllowanceClaimDetail {
  detail_id: number;
  work_date: string;
  shift_code: string;
  day_type: string;
  actual_checkin: string;
  actual_checkout: string;
  extra_hours: number;
  rate_id: number;
  rate_amount: number;
  description: string;
}

export interface MealAllowanceReviewRequest {
  action: 'approved' | 'rejected';
  reviewedBy: string;
  rejectionReason?: string;
}

export interface MealAllowanceClaim {
  claimId: number;
  voucherNo: string;
  employeeCode: string;
  employeeName?: string | null;
  employeeImageUrl?: string | null;
  departmentName?: string | null;
  companyName?: string | null;
  totalAmount: number;
  claimDate: string;
  status: string;
  createdAt: string;
  rejectionReason?: string | null;
  details: MealAllowanceClaimDetail[];
  currentStep?: number;
  approvalSteps?: MealAllowanceApprovalStep[]; // all approvers grouped by step
}

export interface MealAllowancePagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface MealAllowanceClaimsResponse {
  success: boolean;
  data: MealAllowanceClaim[];
  pagination: MealAllowancePagination;
}

export interface MealAllowanceReviewResponse {
  success: boolean;
  message?: string;
  data?: MealAllowanceClaim;
}

export interface MealAllowanceClaimResponse {
  success: boolean;
  data: MealAllowanceClaim;
}

export interface MealAllowancePendingApproval {
  approvalID: number;
  claimID: number;
  stepNo: number;
  originalStep?: number;
  voucherNo: string;
  employeeCode: string;
  employeeName: string | null;
  employeeImageUrl?: string | null;
  totalAmount: number;
  submittedAt: string;
  status: string; // approval step status: pending | approved | rejected
  claimStatus?: string; // overall claim status: Pending | Approved | Rejected
  approverEmpNo?: string;
  approverName?: string;
}

export interface MealAllowancePendingApprovalsSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface MealAllowancePendingApprovalsResponse {
  success: boolean;
  data: MealAllowancePendingApproval[];
  summary?: MealAllowancePendingApprovalsSummary;
}
