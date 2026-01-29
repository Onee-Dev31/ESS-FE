import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, combineLatest, map, finalize } from 'rxjs';
import { catchError, delay } from 'rxjs/operators';
import { LoadingService } from './loading.service';
import { AllowanceService } from './allowance.service';
import { TaxiService } from './taxi.service';
import { TransportService } from './transport.service';
import { MedicalexpensesService } from './medicalexpenses.service';

import { MedicalStat, WelfareItem, LeaveItem, HolidayItem } from '../interfaces/dashboard.interface';
import DateHolidays from 'date-holidays';
import dayjs from 'dayjs';

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    private loadingService = inject(LoadingService);
    private http = inject(HttpClient);
    private allowanceService = inject(AllowanceService);
    private taxiService = inject(TaxiService);
    private transportService = inject(TransportService);
    private medicalService = inject(MedicalexpensesService);

    constructor() { }

    // ดึงจำนวนรายการที่รออนุมัติทั้งหมดจากทุก Service
    // ปรับปรุงให้ทนทานต่อ Error (Resiliency) - ถ้า Service ไหนพัง ข้อมูลที่เหลือยังโหลดได้
    getGlobalPendingCount(): Observable<number> {
        const streams: Observable<any[]>[] = [
            this.allowanceService.getAllowanceRequests().pipe(catchError(() => of([]))),
            this.taxiService.getTaxiRequests().pipe(catchError(() => of([]))),
            this.transportService.getRequests().pipe(catchError(() => of([]))),
            this.medicalService.getMedicalRequests().pipe(catchError(() => of([])))
        ];

        return combineLatest(streams).pipe(
            map((results: any[][]) => {
                const pendingStatuses = ['คำขอใหม่', 'ตรวจสอบแล้ว', 'อยู่ระหว่างการอนุมัติ'];
                return results.reduce((sum, list) =>
                    sum + list.filter(item => pendingStatuses.includes(item.status)).length, 0);
            })
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
            {
                title: 'ค่าเบี้ยเลี้ยง', amount: '10,500', iconName: 'fas fa-dollar-sign', cardClass: 'card-green',
                titleColor: '#15803d', amountColor: '#15803d', route: '/allowance'
            },
            {
                title: 'ค่ารถ', amount: '584', iconName: 'fas fa-car ', cardClass: 'card-blue',
                tooltip: `<div class="text-center mb-3"><i class="fas fa-car fa-2x text-blue-500"></i></div><strong>เงื่อนไข:</strong><ul class="list-unstyled text-left mt-2"><li class="tooltip-condition-item"><i class="fas fa-check-circle text-green-500"></i><span>ค่ารถก่อน 06.00 น. ต้องเข้างานก่อน 06:00 เบิกได้ไม่เกิน 120 บาท/ครั้ง</span></li><li class="tooltip-condition-item"><i class="fas fa-check-circle text-green-500"></i><span>ค่ารถหลัง 22.00 น ต้องทำงานเกิน 22:00 เบิกได้ได้ไม่เกิน 120 บาท/ครั้ง</span></li></ul>`,
                titleColor: '#1e40af', amountColor: '#1e40af', route: '/vehicle'
            },
            {
                title: 'ค่าแท็กซี่', amount: '876', iconName: 'fas fa-taxi', cardClass: 'card-yellow',
                tooltip: `<div class="text-center mb-3"><i class="fas fa-taxi fa-2x text-yellow-600"></i></div><strong>เงื่อนไข:</strong><ul class="list-unstyled text-left mt-2"><li class="tooltip-condition-item"><i class="fas fa-check-circle text-green-500"></i><span>1,000 บาท/ปี</span></li><li class="tooltip-condition-item"><i class="fas fa-check-circle text-green-500"></i><span>ค่า Taxi สำหรับการเดินทางจากสำนักงานและกลับมาที่สำนักงานเท่านั้น</span></li></ul>`,
                titleColor: '#9a3412', amountColor: '#9a3412', route: '/vehicle-taxi'
            },
            {
                title: 'ค่าสมรส', amount: '3,500', iconName: 'fas fa-heart',
                tooltip: `<div class="text-center mb-3"><i class="fas fa-heart fa-2x text-pink-500"></i></div><strong>เงื่อนไข:</strong><ul class="list-unstyled text-left mt-2"><li class="tooltip-condition-item"><i class="fas fa-check-circle text-green-500"></i><span>อายุงาน 1 ปี</span></li><li class="tooltip-condition-item"><i class="fas fa-check-circle text-green-500"></i><span>เบิกได้ 5,000 บาท 1 ครั้ง ตลอดอายุการทำงาน</span></li></ul>`
            },
            {
                title: 'ค่าอุปสมบท', amount: '10,500', iconName: 'fas fa-hands-praying',
                tooltip: `<div class="text-center mb-3"><i class="fas fa-hands-praying fa-2x text-orange-500"></i></div><strong>เงื่อนไข:</strong><ul class="list-unstyled text-left mt-2"><li class="tooltip-condition-item"><i class="fas fa-check-circle text-green-500"></i><span>อายุงาน 1 ปี</span></li><li class="tooltip-condition-item"><i class="fas fa-check-circle text-green-500"></i><span>เบิกได้ 5,000 บาท 1 ครั้ง ตลอดอายุการทำงาน</span></li></ul>`
            },
            {
                title: 'ค่าฌาปนกิจ', amount: '584', iconName: 'fas fa-church',
                tooltip: `<div class="text-center mb-3"><i class="fas fa-church fa-2x text-gray-600"></i></div><strong>เงื่อนไข:</strong><ul class="list-unstyled text-left mt-2"><li class="tooltip-condition-item"><i class="fas fa-check-circle text-green-500"></i><span>เบิกได้ 80,000 บาท/ตลอดอายุการทำงาน</span></li><li class="tooltip-condition-item"><i class="fas fa-check-circle text-green-500"></i><span>พนักงาน 20,000 บาท ครอบครัว(คู่สมรส,บุตร) 10,000 บาท/คน บิดามารดา 10,000 บาท/คน</span></li></ul>`
            },
            {
                title: 'ค่าพวงหรีด', amount: '876', iconName: 'fas fa-spa',
                tooltip: `<div class="text-center mb-3"><i class="fas fa-spa fa-2x text-purple-500"></i></div><strong>เงื่อนไข:</strong><ul class="list-unstyled text-left mt-2"><li class="tooltip-condition-item"><i class="fas fa-check-circle text-green-500"></i><span>เบิกได้ 12,000 บาท/ตลอดอายุการทำงาน</span></li><li class="tooltip-condition-item"><i class="fas fa-check-circle text-green-500"></i><span>พนักงาน 1,500 บาท ครอบครัว(คู่สมรส,บุตร) 1,500 บาท/คน บิดามารดา 1,500 บาท/คน</span></li></ul>`
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
        hd.setLanguages('th'); // Set language to Thai
        const currentYear = dayjs().year();
        const nextYear = currentYear + 1;

        // Get holidays for current and next year
        const holidays = [
            ...hd.getHolidays(currentYear),
            ...hd.getHolidays(nextYear)
        ];

        const result: Record<string, any> = {};

        holidays.forEach(h => {
            const dateStr = h.date.split(' ')[0]; // Format: YYYY-MM-DD HH:mm:ss
            // Check if it's a public holiday (type 'public')
            if (h.type === 'public') {
                result[dateStr] = { type: 'holiday', note: h.name, code: 'HOL' };
            }
        });

        // Add specific leave mock data
        result['2026-01-20'] = { type: 'leave', note: 'ลาพักร้อน', code: 'VAC' };

        return result;
    }
}

