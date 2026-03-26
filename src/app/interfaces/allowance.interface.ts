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
    work_date: string;          // ISO: "2026-03-02T00:00:00"
    actual_checkin: string;     // HH:mm
    actual_checkout: string;    // HH:mm
    scheduled_start: string;    // HH:mm
    scheduled_end: string;      // HH:mm
    day_type: string;           // 'W' = workday, 'H' = holiday, 'T' = ทำงาน
    shift_code: string;
    is_fallback_day_type: number;
    is_fallback_schedule: number;
    actual_hours: number;
    total_hours: number;
    total_hours_text: string;   // "3 ชั่วโมง 5 นาที"
    rounded_hours: number;
    rate_id: number | null;
    rate_amount: number | null;
    is_eligible: number;        // 1 = eligible, 0 = not eligible
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

// ─── Meal Allowance API interfaces ───────────────────────────────────────────

export interface MealAllowanceClaimDetail {
    DetailId: number;
    ClaimId: number;
    WorkDate: string;
    WorkHours: number;
    AllowanceAmount: number;
    Description: string;
}

export interface MealAllowanceClaim {
    ClaimId: number;
    VoucherNo: string;
    EmployeeCode: string;
    TotalAmount: number;
    ClaimDate: string;
    Status: string;
    CreatedAt: string;
    Details: MealAllowanceClaimDetail[];
}

export interface MealAllowancePagination {
    totalCount: number;
    pageNumber: number;
    pageSize: number;
}

export interface MealAllowanceClaimsResponse {
    success: boolean;
    data: MealAllowanceClaim[];
    pagination: MealAllowancePagination;
}
