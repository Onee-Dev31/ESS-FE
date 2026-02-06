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
