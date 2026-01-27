import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Requester, VehicleService, WELFARE_TYPES } from './vehicle.service';

// รายการค่าแท็กซี่
export interface TaxiItem {
    date: string;
    description: string;
    destination: string;
    distance: number;
    amount: number;
    shiftCode?: string;
    attachedFile?: string | null;
}

// ข้อมูลคำขอค่าแท็กซี่
export interface TaxiRequest {
    id: string;
    typeId: number;
    createDate: string;
    status: string;
    items: TaxiItem[];
    requester?: Requester;
}

@Injectable({
    providedIn: 'root'
})
export class TaxiService {
    private vehicleService = inject(VehicleService);

    // ข้อมูลจำลองคำขอค่าแท็กซี่
    private taxiRequestsMock: TaxiRequest[] = this.generateMockTaxiRequests(15);
    private taxiRequestsSubject = new BehaviorSubject<TaxiRequest[]>(this.taxiRequestsMock);

    constructor() { }

    // สร้างข้อมูลจำลองคำขอค่าแท็กซี่
    private generateMockTaxiRequests(count: number): TaxiRequest[] {
        const requests: TaxiRequest[] = [];
        for (let i = 1; i <= count; i++) {
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 60));
            const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

            requests.push({
                id: `2701#${String(i).padStart(3, '0')}`,
                typeId: WELFARE_TYPES.TAXI,
                createDate: dateStr,
                status: this.vehicleService.getRandomStatus('taxi'),
                requester: this.vehicleService.getRandomRequester(),
                items: [
                    { date: dateStr, description: 'เดินทางไปพบลูกค้ากนกวัฒนา', destination: 'GMM Grammy', distance: 12.5, amount: 250, shiftCode: 'O01 09.00-18.00', attachedFile: 'receipt_01.jpg' },
                    { date: dateStr, description: 'เดินทางกลับสำนักงานจากพบลูกค้า', destination: 'Office', distance: 12.5, amount: 230, shiftCode: 'O01 09.00-18.00', attachedFile: 'receipt_02.jpg' }
                ]
            });
        }
        return requests;
    }

    // ดึงข้อมูลคำขอค่าแท็กซี่ทั้งหมด
    getTaxiRequests(): Observable<TaxiRequest[]> {
        return this.taxiRequestsSubject.asObservable().pipe(delay(200));
    }

    // ดึงข้อมูลคำขอค่าแท็กซี่ตาม ID
    getTaxiRequestById(id: string): Observable<TaxiRequest | undefined> {
        const item = this.taxiRequestsMock.find(r => r.id === id);
        return of(item).pipe(delay(200));
    }

    // เพิ่มคำขอค่าแท็กซี่ใหม่
    addTaxiRequest(request: TaxiRequest): Observable<void> {
        this.taxiRequestsMock = [request, ...this.taxiRequestsMock];
        this.taxiRequestsSubject.next(this.taxiRequestsMock);
        return of(void 0).pipe(delay(300));
    }

    // อัปเดตข้อมูลคำขอค่าแท็กซี่
    updateTaxiRequest(id: string, updatedRequest: TaxiRequest): Observable<void> {
        this.taxiRequestsMock = this.taxiRequestsMock.map(r => r.id === id ? updatedRequest : r);
        this.taxiRequestsSubject.next(this.taxiRequestsMock);
        return of(void 0).pipe(delay(300));
    }

    // ลบคำขอค่าแท็กซี่
    deleteTaxiRequest(id: string): Observable<void> {
        this.taxiRequestsMock = this.taxiRequestsMock.filter(r => r.id !== id);
        this.taxiRequestsSubject.next(this.taxiRequestsMock);
        return of(void 0).pipe(delay(300));
    }

    // สร้างรหัสคำขอแท็กซี่ถัดไป
    generateNextTaxiId(): Observable<string> {
        const lastIdNum = this.taxiRequestsMock.reduce((max, item) => {
            const num = parseInt(item.id.split('#')[1] || '0');
            return num > max ? num : max;
        }, 0);
        const nextNum = (lastIdNum + 1).toString().padStart(3, '0');
        return of(`2701#${nextNum}`);
    }

    // ดึงข้อมูล log จำลองสำหรับค่าแท็กซี่
    getMockTaxiLogs(month: number, year: number): Observable<any[]> {
        const days = this.vehicleService.generateDays(month, year);
        const results = days.map((date: Date) => {
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const dayType = isWeekend ? 'H' : 'W';

            let checkIn = '';
            let checkOut = '';

            if (dayType === 'W') {
                checkIn = `09:${String(Math.floor(Math.random() * 59)).padStart(2, '0')}`;
                checkOut = `18:${String(Math.floor(Math.random() * 59)).padStart(2, '0')}`;
            }

            return {
                date: this.vehicleService.formatDate(date),
                dayType: dayType,
                checkIn: checkIn,
                checkOut: checkOut,
                description: '',
                destination: '',
                distance: 0,
                amount: 0,
                selected: false,
                shiftCode: this.vehicleService.getRandomShiftCode()
            };
        });
        return of(results).pipe(delay(200));
    }

    // อัปเดตสถานะคำขอแท็กซี่
    updateTaxiStatus(id: string, status: string): void {
        this.taxiRequestsMock = this.taxiRequestsMock.map(r =>
            r.id === id ? { ...r, status: status } : r
        );
        this.taxiRequestsSubject.next(this.taxiRequestsMock);
    }
}

