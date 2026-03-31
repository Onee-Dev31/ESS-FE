export interface MedicalStat {
    label: string;
    subLabel: string;
    used: string;
    balance: string;
    percent: number;
    type: 'outpatient' | 'dental' | 'optical' | 'inpatient';
}

export interface LeaveItem {
    type: 'vacation' | 'business' | 'sick' | 'sterilization' | 'funeral';
    label: string;
    count: string;
    balance: number;
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
