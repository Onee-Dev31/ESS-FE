import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, delay } from 'rxjs';
import { LoadingService } from './loading.service';
import { ApprovalsHelperService } from './approvals-helper.service';
import { MedicalStat, WelfareItem, LeaveItem, HolidayItem } from '../interfaces/dashboard.interface';
import DateHolidays from 'date-holidays';
import dayjs from 'dayjs';

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    private loadingService = inject(LoadingService);
    private approvalsHelper = inject(ApprovalsHelperService);

    private readonly PENDING_STATUSES = ['NEW', 'WAITING_CHECK', 'VERIFIED', 'PENDING_APPROVAL', 'คำขอใหม่', 'ตรวจสอบแล้ว', 'อยู่ระหว่างการอนุมัติ'];

    constructor() { }

    getGlobalPendingCount(): Observable<number> {
        return this.approvalsHelper.getAllCategoriesApprovals().pipe(
            map(items => items.filter(item => this.PENDING_STATUSES.includes(item.rawStatus)).length)
        );
    }

    getMedicalPendingCount(): Observable<number> {
        return this.approvalsHelper.getApprovals('medical').pipe(
            map(items => items.filter(item => this.PENDING_STATUSES.includes(item.rawStatus)).length)
        );
    }

    getMedicalStats(): Observable<MedicalStat[]> {
        const stats: MedicalStat[] = [
            { label: 'ผู้ป่วยนอก', subLabel: '(15,000/ปี)', used: '3,000', balance: '12,000', balanceColor: 'text-balance', progressColor: 'bg-red', percent: 20 },
            { label: 'ทันตกรรม', subLabel: '(1,000/ปี)', used: '1,000', balance: '0', balanceColor: 'text-balance', progressColor: 'bg-blue', percent: 100 },
            { label: 'สายตา', subLabel: '(1,000/ปี)', used: '1,000', balance: '0', balanceColor: 'text-balance', progressColor: 'bg-indigo', percent: 100 },
            { label: 'ผู้ป่วยใน', subLabel: '(40,000/ปี)', used: '3,000', balance: '37,000', balanceColor: 'text-balance', progressColor: 'bg-green', percent: 7.5 },
        ];
        return this.loadingService.wrap(of(stats).pipe(delay(100)));
    }

    getWelfareStats(): Observable<WelfareItem[]> {
        const stats: WelfareItem[] = [
            { title: 'ค่าเบี้ยเลี้ยง', amount: '10,500', iconName: 'fas fa-dollar-sign', cardClass: 'card-green', titleColor: '#15803d', amountColor: '#15803d', route: '/allowance' },
            {
                title: 'ค่ารถ', amount: '584', iconName: 'fas fa-car ', cardClass: 'card-blue',
                tooltip: '<div class="tooltip-condition-item"><i class="fas fa-info-circle text-blue-500"></i><strong>เงื่อนไข :</strong></div><div class="tooltip-condition-item"><span>- ค่ารถก่อน 06.00 น. ต้องเข้างานก่อน 06:00 เบิกได้ไม่เกิน 120 บาท/ครั้ง</span></div><div class="tooltip-condition-item"><span>- ค่ารถหลัง 22.00 น. ต้องทำงานเกิน 22:00 เบิกได้ไม่เกิน 120 บาท/ครั้ง</span></div>',
                titleColor: '#1e40af', amountColor: '#1e40af', route: '/vehicle'
            },
            {
                title: 'ค่าแท็กซี่', amount: '876', iconName: 'fas fa-taxi', cardClass: 'card-yellow',
                tooltip: '<div class="tooltip-condition-item"><i class="fas fa-info-circle text-blue-500"></i><strong>เงื่อนไข :</strong></div><div class="tooltip-condition-item"><span>- 1,000 บาท / ปี</span></div><div class="tooltip-condition-item"><span>- ค่า Taxi สำหรับการเดินทางจากสำนักงานและกลับมาที่สำนักงานเท่านั้น</span></div>',
                titleColor: '#9a3412', amountColor: '#9a3412', route: '/vehicle-taxi'
            },
            {
                title: 'ค่าสมรส', amount: '3,500', iconName: 'fas fa-heart',
                tooltip: '<div class="tooltip-condition-item"><i class="fas fa-info-circle text-blue-500"></i><strong>เงื่อนไข :</strong></div><div class="tooltip-condition-item"><span>- อายุงาน 1 ปี</span></div><div class="tooltip-condition-item"><span>- เบิกได้ 5,000 บาท 1 ครั้ง ตลอดอายุงาน</span></div>'
            },
            {
                title: 'ค่าอุปสมบท', amount: '10,500', iconName: 'fas fa-hands-praying',
                tooltip: '<div class="tooltip-condition-item"><i class="fas fa-info-circle text-blue-500"></i><strong>เงื่อนไข :</strong></div><div class="tooltip-condition-item"><span>- อายุงาน 1 ปี เพศชาย</span></div><div class="tooltip-condition-item"><span>- เบิกได้ 5,000 บาท 1 ครั้ง ตลอดอายุงาน</span></div>'
            },
            {
                title: 'ค่าฌาปนกิจ', amount: '584', iconName: 'fas fa-church',
                tooltip: '<div class="tooltip-condition-item"><i class="fas fa-info-circle text-blue-500"></i><strong>เงื่อนไข :</strong></div><div class="tooltip-condition-item"><span>- เบิกได้ 80,000 บาท / ตลอดอายุงาน</span></div><div class="tooltip-condition-item"><span>- พนักงาน 20,000 บาท ครอบครัว (คู่สมรส,บุตร) 10,000บาท/คน บิดามารดา 10,000 บาท/คน</span></div>'
            },
            {
                title: 'ค่าพวงหรีด', amount: '876', iconName: 'fas fa-spa',
                tooltip: '<div class="tooltip-condition-item"><i class="fas fa-info-circle text-blue-500"></i><strong>เงื่อนไข :</strong></div><div class="tooltip-condition-item"><span>- เบิกได้ 12,000 บาท / ตลอดอายุงาน</span></div><div class="tooltip-condition-item"><span>- พนักงาน 1,500 บาท ครอบครัว (คู่สมรส,บุตร) 1,500บาท/คน บิดามารดา 1,500 บาท/คน</span></div>'
            }
        ];
        return this.loadingService.wrap(of(stats).pipe(delay(100)));
    }

    getLeaveStats(): Observable<LeaveItem[]> {
        const leaves: LeaveItem[] = [
            { label: 'ลาพักร้อน', count: '01/09', countColor: '#dc3545', iconClass: 'fas fa-plane-departure', iconColor: '#ef4444', theme: 'theme-pink', balance: 8 },
            { label: 'ลากิจ', count: '03/06', countColor: '#0d6efd', iconClass: 'fas fa-briefcase', iconColor: '#3b82f6', theme: 'theme-blue', balance: 3 },
            { label: 'ลาป่วย', count: '10/30', countColor: '#4650dd', iconClass: 'fas fa-stethoscope', iconColor: '#4049c7', theme: 'theme-purple', balance: 20 },
            { label: 'ลาทำหมัน', count: '03/06', countColor: '#4650dd', iconClass: 'fas fa-user-md', iconColor: '#9333ea', theme: 'theme-purple', balance: 3 },
            { label: 'ลาเพื่อจัดการงานศพ', count: '03/06', countColor: '#35b653', iconClass: 'fas fa-ribbon', iconColor: '#35b653', theme: 'theme-green', balance: 3 },
        ];
        return this.loadingService.wrap(of(leaves).pipe(delay(100)));
    }

    getHolidays(): Observable<HolidayItem[]> {
        return this.loadingService.wrap(of([
            { date: '05/12/2569', name: 'วันคล้ายวันพระบรมราชสมภพ ร.9' },
            { date: '10/12/2569', name: 'วันรัฐธรรมนูญ' },
            { date: '31/12/2569', name: 'วันสิ้นปี' }
        ]).pipe(delay(100)));
    }

    getAttendanceList(): any[] {
        return [
            { label: 'ลาป่วย', value: '10 วัน' },
            { label: 'ลาพักร้อน', value: '5 วัน' },
            { label: 'ลากิจ', value: '5 วัน' },
            { label: 'มาสาย', value: '5 ครั้ง' },
            { label: 'ขาดงาน', value: '5 ครั้ง' }
        ];
    }

    getPerformanceList(): any[] {
        return [
            { year: 'ปี 2026', grade: 'เกรด A+' },
            { year: 'ปี 2025', grade: 'เกรด A' },
            { year: 'ปี 2024', grade: 'เกรด B+' },
            { year: 'ปี 2023', grade: 'เกรด B' },
            { year: 'ปี 2022', grade: 'เกรด C+' },
            { year: 'ปี 2021', grade: 'เกรด C' }
        ];
    }

    getSpecialDates(): Record<string, any> {
        const hd = new DateHolidays('TH');
        hd.setLanguages('th');
        const currentYear = dayjs().year();
        const nextYear = currentYear + 1;
        const holidays = [...hd.getHolidays(currentYear), ...hd.getHolidays(nextYear)];
        const result: Record<string, any> = {};
        holidays.forEach(h => {
            const dateStr = h.date.split(' ')[0];
            if (h.type === 'public') result[dateStr] = { type: 'holiday', note: h.name, code: 'HOL' };
        });
        result['2026-01-20'] = { type: 'leave', note: 'ลาพักร้อน', code: 'VAC' };
        return result;
    }
}
