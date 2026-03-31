export interface MedicalStat {
    label: string;
    subLabel: string;
    used: string;
    balance: string;
    percent: number;
    type: 'outpatient' | 'dental' | 'optical' | 'inpatient';
}

export interface LeaveSummaryItem {
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
    quota_days: number | null;
    used_days: number;
    remaining_days: number | null;
    once_career_used: number | null;
    service_year_eligible: number;
}

export interface HolidayItem {
    date: string;
    name: string;
}

export interface AttendanceStat {
    label: string;
    value: string;
}

export interface PerformanceItem {
    year: string;
    grade: string;
}

export interface SpecialDate {
    type: string;
    note: string;
    code: string;
}

export interface EmployeeServiceInfo {
    service_info: {
        start_date_display: string;
        service_years: number;
        start_date_ce: string;
        start_date_raw: string;
    };
    evaluations: {
        has_data?: number;
        year: string | null;
        position: string | null;
        total_score: number | null;
        total_grade: string | null;
        hr_grade: string | null;
        evaluator1_grade: string | null;
        evaluator2_grade: string | null;
        evaluator2_grade_override: string | null;
        self_grade: string | null;
        status: string;
    }[];
}
