import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

// Interface สำหรับใช้งานร่วมกัน
export interface MedicalStat { label: string; subLabel: string; used: string; balance: string; balanceColor: string; progressColor: string; percent: number; }
export interface WelfareItem { title: string; amount: string; iconName: string; cardClass?: string; titleColor?: string; amountColor?: string; tooltip?: string; route?: string; }
export interface LeaveItem { label: string; count: string; countColor: string; iconClass: string; iconColor?: string; theme: string; balance: number; }
export interface HolidayItem { date: string; name: string; }

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    // สำหรับเชื่อมต่อ API
    private http = inject(HttpClient);

    constructor() { }

    /**
     * ดึงข้อมูลสถิติการรักษาพยาบาล
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
     * ดึงข้อมูลสวัสดิการ
     */
    getWelfareStats(): Observable<WelfareItem[]> {
        const stats: WelfareItem[] = [
            {
                title: 'ค่าเบี้ยเลี้ยง', amount: '10,500', iconName: 'fas fa-dollar-sign', cardClass: 'card-green',
                titleColor: '#15803d', amountColor: '#15803d', route: '/allowance'
            },
            {
                title: 'ค่ารถ', amount: '584', iconName: 'fas fa-car', cardClass: 'card-blue',
                tooltip: `<strong>เงื่อนไข:</strong><br />- ค่ารถก่อน 06:00 น. ต้องเข้างานก่อน 06:00 น. เบิกได้ไม่เกิน 120 บาท/ครั้ง<br />- ค่ารถหลัง 22:00 น. ต้องเข้างานเกิน 22:00 น. เบิกได้ไม่เกิน 120 บาท/ครั้ง`,
                titleColor: '#1e40af', amountColor: '#1e40af', route: '/vehicle'
            },
            {
                title: 'ค่าแท็กซี่', amount: '876', iconName: 'fas fa-taxi', cardClass: 'card-yellow',
                tooltip: `<strong>เงื่อนไข:</strong><br />- 1,000 บาท/ปี<br />- ค่า Taxi สำหรับการเดินทางจากสำนักงานและกลับมาที่สำนักงานเท่านั้น`,
                titleColor: '#9a3412', amountColor: '#9a3412', route: '/vehicle-taxi'
            },
            {
                title: 'ค่าสมรส', amount: '3,500', iconName: 'fas fa-heart',
                tooltip: `<strong>เงื่อนไข:</strong><br />- อายุงานครบ 1 ปี<br />- เบิกได้ 5,000 บาท 1 ครั้งตลอดอายุงาน`
            },
            {
                title: 'ค่าอุปสมบท', amount: '10,500', iconName: 'fas fa-hands-praying',
                tooltip: `<strong>เงื่อนไข:</strong><br />- อายุงาน 1 ปี เพศชาย<br />- เบิกได้ 5,000 บาท 1 ครั้งตลอดอายุงาน`
            },
            {
                title: 'ค่าฌาปนกิจ', amount: '584', iconName: 'fas fa-church',
                tooltip: `<strong>เงื่อนไข :</strong><br />- เบิกได้ 80,000 บาท/ตลอดอายุงาน<br />- พนักงาน 20,000 บาท ครอบครัว(คู่สมรส,บุตร) 10,000 บาท/คน บิดามารดา 10,000 บาท/คน`
            },
            {
                title: 'ค่าพวงหรีด', amount: '876', iconName: 'fas fa-spa',
                tooltip: `<strong>เงื่อนไข :</strong><br />- เบิกได้ 12,000 บาท/ตลอดอายุงาน<br />- พนักงาน 1,500 บาท ครอบครัว(คู่สมรส,บุตร) 1,500 บาท/คน บิดามารดา 1,500 บาท/คน`
            }
        ];
        return of(stats).pipe(delay(300));
    }

    /**
     * ดึงข้อมูลการลา
     */
    getLeaveStats(): Observable<LeaveItem[]> {
        const leaves: LeaveItem[] = [
            { label: 'ลาพักร้อน', count: '01/09', countColor: '#dc3545', iconClass: 'fas fa-plane-departure', iconColor: '#ef4444', theme: 'theme-pink', balance: 8 },
            { label: 'ลากิจ', count: '03/06', countColor: '#0d6efd', iconClass: 'fas fa-briefcase', iconColor: '#3b82f6', theme: 'theme-blue', balance: 3 },
            { label: 'ลาป่วย', count: '10/30', countColor: '#4650dd', iconClass: 'fas fa-stethoscope', iconColor: '#4049c7', theme: 'theme-purple', balance: 20 },
            { label: 'ลาเพื่อประกอบพิธีสมรส', count: '0/5', countColor: '#35b653', iconClass: 'fas fa-ring', iconColor: '#35b653', theme: 'theme-green', balance: 5 },
            { label: 'ลาคลอด', count: '01/09', countColor: '#dc3545', iconClass: 'fas fa-baby-carriage', iconColor: '#ef4444', theme: 'theme-pink', balance: 8 },
            { label: 'ลาต่อเนื่องจากลาคลอด (บุตรเจ็บป่วย)', count: '03/06', countColor: '#0d6efd', iconClass: 'fas fa-hand-holding-heart', iconColor: '#3b82f6', theme: 'theme-blue', balance: 3 },
            { label: 'ลาทำหมัน', count: '03/06', countColor: '#4650dd', iconClass: 'fas fa-user-md', iconColor: '#4049c7', theme: 'theme-purple', balance: 3 },
            { label: 'ลาเพื่อจัดการงานศพ', count: '03/06', countColor: '#35b653', iconClass: 'fas fa-ribbon', iconColor: '#35b653', theme: 'theme-green', balance: 3 },
        ];
        return of(leaves).pipe(delay(300));
    }

    /**
     * ดึงข้อมูลวันหยุด
     */
    getHolidays(): Observable<HolidayItem[]> {
        return of([
            { date: '05/12/2569', name: 'วันคล้ายวันพระบรมราชสมภพ...' },
            { date: '10/12/2569', name: 'วันรัฐธรรมนูญ' },
            { date: '31/12/2569', name: 'วันสิ้นปี' }
        ]).pipe(delay(200));
    }
}
