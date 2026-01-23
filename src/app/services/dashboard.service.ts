import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, combineLatest, map } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AllowanceService } from './allowance.service';
import { TaxiService } from './taxi.service';
import { TransportService } from './transport.service';
import { MedicalexpensesService } from './medicalexpenses.service';

/**
 * อินเตอร์เฟสสำหรับสถิติค่ารักษาพยาบาล
 */
export interface MedicalStat { label: string; subLabel: string; used: string; balance: string; balanceColor: string; progressColor: string; percent: number; }

/**
 * อินเตอร์เฟสสำหรับรายการสวัสดิการ
 */
export interface WelfareItem { title: string; amount: string; iconName: string; cardClass?: string; titleColor?: string; amountColor?: string; tooltip?: string; route?: string; }

/**
 * อินเตอร์เฟสสำหรับรายการแสดงการลา
 */
export interface LeaveItem { label: string; count: string; countColor: string; iconClass: string; iconColor?: string; theme: string; balance: number; }

/**
 * อินเตอร์เฟสสำหรับวันหยุด
 */
export interface HolidayItem { date: string; name: string; }

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    private http = inject(HttpClient);
    private allowanceService = inject(AllowanceService);
    private taxiService = inject(TaxiService);
    private transportService = inject(TransportService);
    private medicalService = inject(MedicalexpensesService);

    constructor() { }

    /**
     * คำนวณจำนวนรายการที่รอการอนุมัติทั้งหมด (Global Pending Count)
     * โดยรวมจากสวัสดิการทุกประเภท
     */
    getGlobalPendingCount(): Observable<number> {
        return combineLatest([
            this.allowanceService.getAllowanceRequests(),
            this.taxiService.getTaxiRequests(),
            this.transportService.getRequests(),
            this.medicalService.getMedicalRequests()
        ]).pipe(
            map(([allowances, taxis, transports, medicals]) => {
                const isPending = (s: string) =>
                    s === 'คำขอใหม่' ||
                    s === 'ตรวจสอบแล้ว' ||
                    s === 'อยู่ระหว่างการอนุมัติ';

                const p1 = allowances.filter(a => isPending(a.status)).length;
                const p2 = taxis.filter(t => isPending(t.status)).length;
                const p3 = transports.filter(v => isPending(v.status)).length;
                const p4 = medicals.filter(m => isPending(m.status)).length;

                return p1 + p2 + p3 + p4;
            })
        );
    }

    /**
     * ดึงข้อมูลสรุปวงเงินค่ารักษาพยาบาล
     */
    getMedicalStats(): Observable<MedicalStat[]> {
        const stats: MedicalStat[] = [
            { label: 'ผู้ป่วยนอก', subLabel: '(15,000/ปี)', used: '3,000', balance: '12,000', balanceColor: 'text-balance', progressColor: 'bg-red', percent: 20 },
            { label: 'ทันตกรรม', subLabel: '(1,000/ปี)', used: '1,000', balance: '0', balanceColor: 'text-balance', progressColor: 'bg-blue', percent: 100 },
            { label: 'สายตา', subLabel: '(1,000/ปี)', used: '1,000', balance: '0', balanceColor: 'text-balance', progressColor: 'bg-indigo', percent: 100 },
            { label: 'ผู้ป่วยใน', subLabel: '(40,000/ปี)', used: '3,000', balance: '37,000', balanceColor: 'text-balance', progressColor: 'bg-green', percent: 7.5 },
        ];
        return of(stats).pipe(delay(300));
    }

    /**
     * ดึงข้อมูลสรุปการเบิกสวัสดิการต่างๆ ของพนักงาน
     */
    getWelfareStats(): Observable<WelfareItem[]> {
        const stats: WelfareItem[] = [
            {
                title: 'ค่าเบี้ยเลี้ยง', amount: '10,500', iconName: 'fas fa-dollar-sign', cardClass: 'card-green',
                titleColor: '#15803d', amountColor: '#15803d', route: '/allowance'
            },
            {
                title: 'ค่ารถ', amount: '584', iconName: 'fas fa-car', cardClass: 'card-blue',
                tooltip: `<strong>เงื่อนไข:</strong>ย้อนหลัง 22:00 หรือ ก่อน 06:00 น.`,
                titleColor: '#1e40af', amountColor: '#1e40af', route: '/vehicle'
            },
            {
                title: 'ค่าแท็กซี่', amount: '876', iconName: 'fas fa-taxi', cardClass: 'card-yellow',
                tooltip: `<strong>เงื่อนไข:</strong>เบิกได้ตามจริง ไม่เกินวงเงิน 1,000 บาท/ปี`,
                titleColor: '#9a3412', amountColor: '#9a3412', route: '/vehicle-taxi'
            },
            {
                title: 'ค่าสมรส', amount: '3,500', iconName: 'fas fa-heart',
                tooltip: `<strong>เงื่อนไข:</strong>ปฏิบัติงานครบ 1 ปีขึ้นไป`
            },
            {
                title: 'ค่าอุปสมบท', amount: '10,500', iconName: 'fas fa-hands-praying',
                tooltip: `<strong>เงื่อนไข:</strong>ปฏิบัติงานครบ 1 ปีขึ้นไป`
            },
            {
                title: 'ค่าฌาปนกิจ', amount: '584', iconName: 'fas fa-church',
                tooltip: `<strong>เงื่อนไข:</strong>กรณีพนักงานหรือครอบครัวเสียชีวิต`
            },
            {
                title: 'ค่าพวงหรีด', amount: '876', iconName: 'fas fa-spa',
                tooltip: `<strong>เงื่อนไข:</strong>ระเบียบบริษัทสวัสดิการช่วยเหลือ`
            }
        ];
        return of(stats).pipe(delay(300));
    }

    /**
     * ดึงข้อมูลสรุปสิทธิ์การลาประเภทต่างๆ
     */
    getLeaveStats(): Observable<LeaveItem[]> {
        const leaves: LeaveItem[] = [
            { label: 'ลาพักร้อน', count: '01/09', countColor: '#dc3545', iconClass: 'fas fa-plane-departure', iconColor: '#ef4444', theme: 'theme-pink', balance: 8 },
            { label: 'ลากิจ', count: '03/06', countColor: '#0d6efd', iconClass: 'fas fa-briefcase', iconColor: '#3b82f6', theme: 'theme-blue', balance: 3 },
            { label: 'ลาป่วย', count: '10/30', countColor: '#4650dd', iconClass: 'fas fa-stethoscope', iconColor: '#4049c7', theme: 'theme-purple', balance: 20 },
            { label: 'ลาทำหมัน', count: '03/06', countColor: '#4650dd', iconClass: 'fas fa-user-md', iconColor: '#4049c7', theme: 'theme-purple', balance: 3 },
            { label: 'ลาเพื่อจัดการงานศพ', count: '03/06', countColor: '#35b653', iconClass: 'fas fa-ribbon', iconColor: '#35b653', theme: 'theme-green', balance: 3 },
        ];
        return of(leaves).pipe(delay(300));
    }

    /**
     * ดึงประกาศวันหยุดบริษัท
     */
    getHolidays(): Observable<HolidayItem[]> {
        return of([
            { date: '05/12/2569', name: 'วันคล้ายวันพระบรมราชสมภพ ร.9' },
            { date: '10/12/2569', name: 'วันรัฐธรรมนูญ' },
            { date: '31/12/2569', name: 'วันสิ้นปี' }
        ]).pipe(delay(200));
    }
}
