import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Requester, VehicleService, WELFARE_TYPES } from './vehicle.service';

/**
 * อินเตอร์เฟสสำหรับรายการค่าพาหนะ
 */
export interface RequestItem {
    date: string;
    description: string;
    amount: number;
    shiftCode?: string;
}

/**
 * อินเตอร์เฟสสำหรับคำขอเบิกค่าพาหนะ
 */
export interface VehicleRequest {
    id: string;
    typeId: number;
    createDate: string;
    status: string;
    items: RequestItem[];
    requester?: Requester;
}

@Injectable({
    providedIn: 'root'
})
export class TransportService {
    private vehicleService = inject(VehicleService);

    // ข้อมูลจำลองสำหรับคำขอเบิกค่าพาหนะ
    private requestsMock: VehicleRequest[] = this.generateMockVehicleRequests(15);
    private requestsSubject = new BehaviorSubject<VehicleRequest[]>(this.requestsMock);

    constructor() { }

    /**
     * สร้างข้อมูลจำลองสำหรับคำขอเบิกค่าพาหนะ
     * @param count จำนวนรายการ
     */
    private generateMockVehicleRequests(count: number): VehicleRequest[] {
        const requests: VehicleRequest[] = [];
        for (let i = 1; i <= count; i++) {
            const dateStr = this.vehicleService.getRandomDateInPast3Months();
            requests.push({
                id: `2701#${String(i).padStart(3, '0')}`,
                typeId: WELFARE_TYPES.TRANSPORT,
                createDate: dateStr,
                status: this.vehicleService.getRandomStatus('vehicle'),
                requester: this.vehicleService.getRandomRequester(),
                items: [
                    { date: '2026-01-01', description: 'เดินทางไปสำนักงานใหญ่', amount: 150, shiftCode: 'O01 09.00-18.00' },
                    { date: '2026-01-02', description: 'เดินทางไปคลังสินค้าสำโรง', amount: 150, shiftCode: 'O01 09.00-18.00' },
                    { date: '2026-01-03', description: 'เดินทางกลับจากคลังสินค้า', amount: 150, shiftCode: 'O01 09.00-18.00' }
                ]
            });
        }
        return requests;
    }

    /**
     * ดึงรายการคำขอเบิกค่าพาหนะทั้งหมด
     */
    getRequests(): Observable<VehicleRequest[]> {
        return this.requestsSubject.asObservable().pipe(delay(200));
    }

    /**
     * ดึงข้อมูลคำขอเบิกค่าพาหนะตาม ID
     * @param id รหัสคำขอ
     */
    getRequestById(id: string): Observable<VehicleRequest | undefined> {
        const item = this.requestsMock.find(r => r.id === id);
        return of(item).pipe(delay(200));
    }

    /**
     * เพิ่มคำขอเบิกค่าพาหนะใหม่
     * @param request ข้อมูลคำขอ
     */
    addRequest(request: VehicleRequest): Observable<void> {
        this.requestsMock = [request, ...this.requestsMock];
        this.requestsSubject.next(this.requestsMock);
        return of(void 0).pipe(delay(300));
    }

    /**
     * อัปเดตข้อมูลคำขอเบิกค่าพาหนะ
     * @param id รหัสคำขอ
     * @param updatedRequest ข้อมูลที่อัปเดต
     */
    updateRequest(id: string, updatedRequest: VehicleRequest): Observable<void> {
        this.requestsMock = this.requestsMock.map(r => r.id === id ? updatedRequest : r);
        this.requestsSubject.next(this.requestsMock);
        return of(void 0).pipe(delay(300));
    }

    /**
     * ลบรายการคำขอเบิกค่าพาหนะ
     * @param id รหัสคำขอ
     */
    deleteRequest(id: string): Observable<void> {
        this.requestsMock = this.requestsMock.filter(r => r.id !== id);
        this.requestsSubject.next(this.requestsMock);
        return of(void 0).pipe(delay(300));
    }

    /**
     * สร้างเลขที่เอกสารการเบิกค่าพาหนะถัดไป
     */
    generateNextId(): Observable<string> {
        const lastIdNum = this.requestsMock.reduce((max, item) => {
            const num = parseInt(item.id.split('#')[1] || '0');
            return num > max ? num : max;
        }, 0);
        const nextNum = (lastIdNum + 1).toString().padStart(3, '0');
        return of(`2701#${nextNum}`);
    }

    /**
     * ดึงข้อมูล Log การลงเวลาจำลอง
     * @param month เดือน
     * @param year ปี
     */
    getMockAttendanceLogs(month: number, year: number): Observable<any[]> {
        const days = this.vehicleService.generateDays(month, year);
        const results = days.map(date => {
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const dayType = isWeekend ? 'H' : 'W';

            let timeIn = '';
            let timeOut = '';
            let description = '';

            if (dayType === 'W') {
                const scenario = Math.random();
                if (scenario > 0.9) {
                    timeIn = '09:00';
                    timeOut = '23:30';
                    description = 'มาเช้า-กลับดึก';
                } else if (scenario > 0.8) {
                    timeIn = '05:30';
                    timeOut = '18:00';
                    description = 'มาทำงานเช้ามืด';
                } else {
                    const inHour = 8 + Math.floor(Math.random() * 2);
                    const inMin = Math.floor(Math.random() * 60);
                    const outHour = 17 + Math.floor(Math.random() * 2);
                    const outMin = Math.floor(Math.random() * 60);
                    timeIn = `${String(inHour).padStart(2, '0')}:${String(inMin).padStart(2, '0')}`;
                    timeOut = `${String(outHour).padStart(2, '0')}:${String(outMin).padStart(2, '0')}`;
                }
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
     * อัปเดตสถานะของคำขอเบิกค่าพาหนะ
     * @param id รหัสคำขอ
     * @param status สถานะใหม่
     */
    updateStatus(id: string, status: string): void {
        this.requestsMock = this.requestsMock.map(r =>
            r.id === id ? { ...r, status: status } : r
        );
        this.requestsSubject.next(this.requestsMock);
    }
}
