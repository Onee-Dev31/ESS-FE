/**
 * @file Dashboard Interface
 * @description Logic for Dashboard Interface
 */

// Section: Logic
export interface MedicalStat {
    label: string;
    subLabel: string;
    used: string;
    balance: string;
    balanceColor: string;
    progressColor: string;
    percent: number;
}

export interface WelfareItem {
    title: string;
    amount: string;
    iconName: string;
    cardClass?: string;
    titleColor?: string;
    amountColor?: string;
    tooltip?: string;
    route?: string;
}

export interface LeaveItem {
    label: string;
    count: string;
    countColor: string;
    iconClass: string;
    iconColor?: string;
    theme: string;
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
