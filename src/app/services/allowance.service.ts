import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Requester, VehicleService, WELFARE_TYPES } from './vehicle.service';

/**
 * อินเตอร์เฟสสำหรับรายการเบี้ยเลี้ยง
 */
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
}

/**
 * อินเตอร์เฟสสำหรับคำขอเบิกเบี้ยเลี้ยง
 */
export interface AllowanceRequest {
    id: string; // เช่น 2701#xxx
    typeId: number;
    createDate: string;
    status: string;
    items: AllowanceItem[];
    requester?: Requester;
}

@Injectable({
    providedIn: 'root'
})
export class AllowanceService {
    private vehicleService = inject(VehicleService);

    // ข้อมูลจำลองสำหรับคำขอเบิกเบี้ยเลี้ยง
    private allowanceRequestsMock: AllowanceRequest[] = this.generateMockAllowanceRequests(15);
    private allowanceRequestsSubject = new BehaviorSubject<AllowanceRequest[]>(this.allowanceRequestsMock);

    constructor() { }

    /**
     * สร้างข้อมูลจำลองสำหรับคำขอเบิกเบี้ยเลี้ยง
     * @param count จำนวนรายการที่ต้องการสร้าง
     */
    private generateMockAllowanceRequests(count: number): AllowanceRequest[] {
        const requests: AllowanceRequest[] = [];
        for (let i = 1; i <= count; i++) {
            const dateStr = this.vehicleService.getRandomDateInPast3Months();
            requests.push({
                id: `2701#${String(i).padStart(3, '0')}`,
                typeId: WELFARE_TYPES.ALLOWANCE,
                createDate: dateStr,
                status: this.vehicleService.getRandomStatus('allowance'),
                requester: this.vehicleService.getRandomRequester(),
                items: [
                    { date: '2026-01-10', dayType: 'W', timeIn: '09:00', timeOut: '21:00', description: 'ทำงานล่วงเวลาโปรเจค A', hours: 3, amount: 225, selected: true, shiftCode: 'O01 09.00-21.00' },
                    { date: '2026-01-11', dayType: 'W', timeIn: '09:00', timeOut: '21:00', description: 'ทำงานล่วงเวลาโปรเจค B', hours: 3, amount: 225, selected: true, shiftCode: 'O01 09.00-21.00' },
                    { date: '2026-01-10', dayType: 'W', timeIn: '09:00', timeOut: '21:00', description: 'ทำงานล่วงเวลาโปรเจค A', hours: 3, amount: 2225, selected: true, shiftCode: 'O01 09.00-21.00' }
                ]
            });
        }
        return requests;
    }

    /**
     * ดึงรายการคำขอเบิกเบี้ยเลี้ยงทั้งหมด
     */
    getAllowanceRequests(): Observable<AllowanceRequest[]> {
        return this.allowanceRequestsSubject.asObservable().pipe(delay(200));
    }

    /**
     * ดึงข้อมูลคำขอเบิกเบี้ยเลี้ยงตาม ID
     * @param id รหัสคำขอ
     */
    getAllowanceRequestById(id: string): Observable<AllowanceRequest | undefined> {
        const item = this.allowanceRequestsMock.find(r => r.id === id);
        return of(item).pipe(delay(200));
    }

    /**
     * เพิ่มคำขอเบิกเบี้ยเลี้ยงใหม่
     * @param request ข้อมูลคำขอ
     */
    addAllowanceRequest(request: AllowanceRequest): Observable<void> {
        this.allowanceRequestsMock = [request, ...this.allowanceRequestsMock];
        this.allowanceRequestsSubject.next(this.allowanceRequestsMock);
        return of(void 0).pipe(delay(300));
    }

    /**
     * อัปเดตข้อมูลคำขอเบิกเบี้ยเลี้ยง
     * @param id รหัสคำขอ
     * @param updatedRequest ข้อมูลที่อัปเดต
     */
    updateAllowanceRequest(id: string, updatedRequest: AllowanceRequest): Observable<void> {
        this.allowanceRequestsMock = this.allowanceRequestsMock.map(r => r.id === id ? updatedRequest : r);
        this.allowanceRequestsSubject.next(this.allowanceRequestsMock);
        return of(void 0).pipe(delay(300));
    }

    /**
     * ลบคำขอเบิกเบี้ยเลี้ยง
     * @param id รหัสคำขอ
     */
    deleteAllowanceRequest(id: string): Observable<void> {
        this.allowanceRequestsMock = this.allowanceRequestsMock.filter(r => r.id !== id);
        this.allowanceRequestsSubject.next(this.allowanceRequestsMock);
        return of(void 0).pipe(delay(300));
    }

    /**
     * สร้างเลขที่เอกสารการเบิกเบี้ยเลี้ยงถัดไป
     */
    generateNextAllowanceId(): Observable<string> {
        const prefix = '2701';
        const lastIdNum = this.allowanceRequestsMock.reduce((max, item) => {
            if (item.id.startsWith(prefix)) {
                const parts = item.id.split('#');
                const num = parseInt(parts[1] || '0');
                return num > max ? num : max;
            }
            return max;
        }, 0);

        return of(`${prefix}#${(lastIdNum + 1).toString().padStart(3, '0')}`);
    }

    /**
     * ดึงข้อมูล Log การเข้างานจำลองเพื่อใช้ในการเบิก
     * @param month เดือน
     * @param year ปี
     */
    getMockAllowanceLogs(month: number, year: number): Observable<any[]> {
        const days = this.vehicleService.generateDays(month, year);
        const results = days.map((date: Date) => {
            const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            const dayType = isWeekend ? 'H' : 'W';

            let timeIn = '';
            let timeOut = '';
            let description = '';

            if (dayType === 'W') {
                const startHour = 8 + Math.floor(Math.random() * 2); // 8 or 9
                const startMinute = Math.floor(Math.random() * 60);
                const endHour = 17 + Math.floor(Math.random() * 4); // 17 - 20
                const endMinute = Math.floor(Math.random() * 60);

                timeIn = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
                timeOut = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

                if (Math.random() > 0.7) description = 'ทำงานล่วงเวลา (OT)';
            }

            return {
                date: this.vehicleService.formatDate(date),
                dayType: dayType,
                timeIn: timeIn,
                timeOut: timeOut,
                selected: false,
                description: description,
                shiftCode: this.vehicleService.getRandomShiftCode()
            };
        });
        return of(results).pipe(delay(200));
    }

    /**
     * อัปเดตสถานะของคำขอเบิกเบี้ยเลี้ยง
     * @param id รหัสคำขอ
     * @param status สถานะใหม่
     */
    updateAllowanceStatus(id: string, status: string): void {
        this.allowanceRequestsMock = this.allowanceRequestsMock.map(r =>
            r.id === id ? { ...r, status: status } : r
        );
        this.allowanceRequestsSubject.next(this.allowanceRequestsMock);
    }
}
