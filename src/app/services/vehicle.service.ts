import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject, combineLatest } from 'rxjs';
import { delay, tap, map } from 'rxjs/operators';

export const WELFARE_TYPES = {
    ALLOWANCE: 1,
    TRANSPORT: 2,
    TAXI: 3
};

export interface RequestItem {
    date: string; // วันที่ dd/MM/yyyy
    description: string;
    amount: number;
    shiftCode?: string;
}

export interface Requester {
    name: string;
    employeeId: string;
    department: string;
    company: string;
}

export interface VehicleRequest {
    id: string; // เช่น 2701#001
    typeId: number;
    createDate: string; // วันที่ yyyy-MM-dd
    status: string;
    items: RequestItem[];
    requester?: Requester;
}

export interface AttendanceLog {
    date: string;
    dayType: string; // ประเภทวัน (W, H, L, T)
    timeIn: string;
    timeOut: string;
    amount: number;
    selected: boolean;
    description: string;
}

export interface TaxiItem {
    date: string;
    description: string;
    destination: string;
    distance: number;
    amount: number;
    shiftCode?: string;
    // ใช้สำหรับจัดการข้อมูลไฟล์แนบใน UI
    attachedFile?: string | null;
}

export interface TaxiRequest {
    id: string; // เช่น 2701#xxx
    typeId: number;
    createDate: string; // วันที่ dd/MM/yyyy
    status: string;
    items: TaxiItem[];
    requester?: Requester;
}

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
export class VehicleService {
    private http = inject(HttpClient);

    // จำลองฐานข้อมูล
    private requestsMock: VehicleRequest[] = this.generateMockVehicleRequests(15);
    private taxiRequestsMock: TaxiRequest[] = this.generateMockTaxiRequests(15);
    private allowanceRequestsMock: AllowanceRequest[] = this.generateMockAllowanceRequests(15);

    // ตัวแปรสำหรับกระจายข้อมูล (State)
    private requestsSubject = new BehaviorSubject<VehicleRequest[]>(this.requestsMock);
    private taxiRequestsSubject = new BehaviorSubject<TaxiRequest[]>(this.taxiRequestsMock);
    private allowanceRequestsSubject = new BehaviorSubject<AllowanceRequest[]>(this.allowanceRequestsMock);

    // ==========================================
    // Mock Data Generation
    // ==========================================

    private getRandomStatus(type: 'allowance' | 'taxi' | 'vehicle'): string {
        const statuses = ['คำขอใหม่', 'ตรวจสอบแล้ว', 'อยู่ระหว่างการอนุมัติ', 'อนุมัติแล้ว'];
        return statuses[Math.floor(Math.random() * statuses.length)];
    }

    private getRandomDateInPast3Months(): string {
        const today = new Date();
        const pastDate = new Date();
        pastDate.setMonth(today.getMonth() - 3);
        const randomTime = pastDate.getTime() + Math.random() * (today.getTime() - pastDate.getTime());
        const date = new Date(randomTime);
        // แปลงวันที่เป็น YYYY-MM-DD

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private getRandomRequester(): Requester {
        const users = [
            { name: 'รภีพาญจณ์ พิภัฌรเวชกุล(โจรา)', id: 'OTD01054', dept: '10806-IT Department' },
            { name: 'แพรวนภา บุตรโคษา (แพรว)', id: 'OTD01055', dept: '10801-HR Department' },
            { name: 'สมชาย รักดี', id: 'OTD01056', dept: '10802-Sales Department' },
            { name: 'วิภาวี สวยงาม', id: 'OTD01057', dept: '10803-Marketing' },
            { name: 'กิตติศักดิ์ มั่นคง', id: 'OTD01058', dept: '10804-Operations' }
        ];
        const user = users[Math.floor(Math.random() * users.length)];
        return {
            name: user.name,
            employeeId: user.id,
            department: user.dept,
            company: 'บริษัท OTD'
        };
    }

    private generateMockVehicleRequests(count: number): VehicleRequest[] {
        const requests: VehicleRequest[] = [];
        for (let i = 1; i <= count; i++) {
            const dateStr = this.getRandomDateInPast3Months();
            requests.push({
                id: `2701#${String(i).padStart(3, '0')}`,
                typeId: WELFARE_TYPES.TRANSPORT,
                createDate: dateStr,
                status: this.getRandomStatus('vehicle'),
                requester: this.getRandomRequester(),
                items: [
                    { date: '2026-01-01', description: 'Mock Item 1', amount: 150, shiftCode: 'O01 09.00-18.00' },
                    { date: '2026-01-02', description: 'Mock Item 2', amount: 150, shiftCode: 'O01 09.00-18.00' },
                    { date: '2026-01-03', description: 'Mock Item 3', amount: 150, shiftCode: 'O01 09.00-18.00' }
                ]
            });
        }
        return requests;
    }

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
                status: this.getRandomStatus('taxi'),
                requester: this.getRandomRequester(),
                items: [
                    { date: dateStr, description: 'เดินทางไปหาลูกค้า A', destination: 'GMM Grammy', distance: 12.5, amount: 250, shiftCode: 'O01 09.00-18.00', attachedFile: 'receipt_01.jpg' },
                    { date: dateStr, description: 'กลับจากหาลูกค้า A', destination: 'Office', distance: 12.5, amount: 230, shiftCode: 'O01 09.00-18.00', attachedFile: 'receipt_02.jpg' }
                ]
            });
        }
        return requests;
    }

    private generateMockAllowanceRequests(count: number): AllowanceRequest[] {
        const requests: AllowanceRequest[] = [];
        for (let i = 1; i <= count; i++) {
            const dateStr = this.getRandomDateInPast3Months();
            requests.push({
                id: `2701#${String(i).padStart(3, '0')}`,
                typeId: WELFARE_TYPES.ALLOWANCE,
                createDate: dateStr,
                status: this.getRandomStatus('allowance'),
                requester: this.getRandomRequester(),
                items: [
                    { date: '2026-01-10', dayType: 'W', timeIn: '09:00', timeOut: '21:00', description: 'ทำงานล่วงเวลาโปรเจค A', hours: 3, amount: 225, selected: true, shiftCode: 'O01 09.00-21.00' },
                    { date: '2026-01-11', dayType: 'W', timeIn: '09:00', timeOut: '21:00', description: 'ทำงานล่วงเวลาโปรเจค B', hours: 3, amount: 225, selected: true, shiftCode: 'O01 09.00-21.00' },
                    { date: '2026-01-10', dayType: 'W', timeIn: '09:00', timeOut: '21:00', description: 'ทำงานล่วงเวลาโปรเจค A', hours: 3, amount: 225, selected: true, shiftCode: 'O01 09.00-21.00' }
                ]
            });
        }
        return requests;
    }

    constructor() { }

    /**
     * ดึงข้อมูลทั้งหมด
     */
    getRequests(): Observable<VehicleRequest[]> {
        return this.requestsSubject.asObservable().pipe(delay(200));
    }

    getRequestById(id: string): Observable<VehicleRequest | undefined> {
        const item = this.requestsMock.find(r => r.id === id);
        return of(item).pipe(delay(200));
    }

    addRequest(request: VehicleRequest): Observable<void> {
        // (API) เพิ่มข้อมูลใหม่
        this.requestsMock = [request, ...this.requestsMock];
        this.requestsSubject.next(this.requestsMock);
        return of(void 0).pipe(delay(300));
    }

    updateRequest(id: string, updatedRequest: VehicleRequest): Observable<void> {
        // (API) อัปเดตข้อมูล
        this.requestsMock = this.requestsMock.map(r => r.id === id ? updatedRequest : r);
        this.requestsSubject.next(this.requestsMock);
        return of(void 0).pipe(delay(300));
    }

    deleteRequest(id: string): Observable<void> {
        // (API) ลบข้อมูล
        this.requestsMock = this.requestsMock.filter(r => r.id !== id);
        this.requestsSubject.next(this.requestsMock);
        return of(void 0).pipe(delay(300));
    }

    generateNextId(): Observable<string> {
        // สร้าง ID ใหม่ (จำลอง Server)
        const lastIdNum = this.requestsMock.reduce((max, item) => {
            const num = parseInt(item.id.split('#')[1] || '0');
            return num > max ? num : max;
        }, 0);
        const nextNum = (lastIdNum + 1).toString().padStart(3, '0');
        return of(`2701#${nextNum}`);
    }

    // --- ส่วนของ Taxi ---

    getTaxiRequests(): Observable<TaxiRequest[]> {
        return this.taxiRequestsSubject.asObservable().pipe(delay(200));
    }

    getTaxiRequestById(id: string): Observable<TaxiRequest | undefined> {
        const item = this.taxiRequestsMock.find(r => r.id === id);
        return of(item).pipe(delay(200));
    }

    addTaxiRequest(request: TaxiRequest): Observable<void> {
        this.taxiRequestsMock = [request, ...this.taxiRequestsMock];
        this.taxiRequestsSubject.next(this.taxiRequestsMock);
        return of(void 0).pipe(delay(300));
    }

    updateTaxiRequest(id: string, updatedRequest: TaxiRequest): Observable<void> {
        this.taxiRequestsMock = this.taxiRequestsMock.map(r => r.id === id ? updatedRequest : r);
        this.taxiRequestsSubject.next(this.taxiRequestsMock);
        return of(void 0).pipe(delay(300));
    }

    deleteTaxiRequest(id: string): Observable<void> {
        this.taxiRequestsMock = this.taxiRequestsMock.filter(r => r.id !== id);
        this.taxiRequestsSubject.next(this.taxiRequestsMock);
        return of(void 0).pipe(delay(300));
    }

    generateNextTaxiId(): Observable<string> {
        const lastIdNum = this.taxiRequestsMock.reduce((max, item) => {
            const num = parseInt(item.id.split('#')[1] || '0');
            return num > max ? num : max;
        }, 0);
        const nextNum = (lastIdNum + 1).toString().padStart(3, '0');
        return of(`2701#${nextNum}`);
    }

    // --- ส่วนของเบี้ยเลี้ยง ---

    getAllowanceRequests(): Observable<AllowanceRequest[]> {
        return this.allowanceRequestsSubject.asObservable().pipe(delay(200));
    }

    getAllowanceRequestById(id: string): Observable<AllowanceRequest | undefined> {
        const item = this.allowanceRequestsMock.find(r => r.id === id);
        return of(item).pipe(delay(200));
    }

    addAllowanceRequest(request: AllowanceRequest): Observable<void> {
        this.allowanceRequestsMock = [request, ...this.allowanceRequestsMock];
        this.allowanceRequestsSubject.next(this.allowanceRequestsMock);
        return of(void 0).pipe(delay(300));
    }

    updateAllowanceRequest(id: string, updatedRequest: AllowanceRequest): Observable<void> {
        this.allowanceRequestsMock = this.allowanceRequestsMock.map(r => r.id === id ? updatedRequest : r);
        this.allowanceRequestsSubject.next(this.allowanceRequestsMock);
        return of(void 0).pipe(delay(300));
    }

    deleteAllowanceRequest(id: string): Observable<void> {
        this.allowanceRequestsMock = this.allowanceRequestsMock.filter(r => r.id !== id);
        this.allowanceRequestsSubject.next(this.allowanceRequestsMock);
        return of(void 0).pipe(delay(300));
    }

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

    // --- Global Helper for Real-time Updates ---

    getGlobalPendingCount(): Observable<number> {
        return combineLatest([
            this.requestsSubject,
            this.taxiRequestsSubject,
            this.allowanceRequestsSubject
        ]).pipe(
            map(([reqs, taxis, allowances]) => {
                const isPending = (s: string) => s === 'คำขอใหม่' || s === 'ตรวจสอบแล้ว' || s === 'อยู่ระหว่างการอนุมัติ';
                const p1 = reqs.filter(r => isPending(r.status)).length;
                const p2 = taxis.filter(t => isPending(t.status)).length;
                const p3 = allowances.filter(a => isPending(a.status)).length;
                return p1 + p2 + p3;
            })
        );
    }

    updateStatus(id: string, type: 'allowance' | 'taxi' | 'vehicle', status: string): void {
        if (type === 'allowance') {
            this.allowanceRequestsMock = this.allowanceRequestsMock.map(r =>
                r.id === id ? { ...r, status: status } : r
            );
            this.allowanceRequestsSubject.next(this.allowanceRequestsMock);
        } else if (type === 'taxi') {
            this.taxiRequestsMock = this.taxiRequestsMock.map(r =>
                r.id === id ? { ...r, status: status } : r
            );
            this.taxiRequestsSubject.next(this.taxiRequestsMock);
        } else {
            this.requestsMock = this.requestsMock.map(r =>
                r.id === id ? { ...r, status: status } : r
            );
            this.requestsSubject.next(this.requestsMock);
        }
    }

    // --- Dynamic Mock Generation Helper ---

    // Helper สร้างวันที่ในเดือน
    private generateDays(month: number, year: number): Date[] {
        // แปลงปี พ.ศ. เป็น ค.ศ.


        const adYear = year - 543;
        const date = new Date(adYear, month, 1);
        const days: Date[] = [];
        while (date.getMonth() === month) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    }

    private formatDate(d: Date): string {
        // แปลง format วันที่ dd/MM/yyyy

        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();

        return `${dd}/${mm}/${yyyy}`;
    }

    private getRandomShiftCode(): string {
        const shifts = [
            'O01 09.00-18.00', 'O02 10.00-19.00', 'O03 10.00-22.00', 'O04 09.00-23.00', 'O19 19.00-07.00',
            'O01 09.00-18.01', 'O02 10.00-19.01', 'O03 10.00-22.01', 'O04 09.00-23.01', 'O19 19.00-07.01',
            'O01 09.00-18.02', 'O01 09.00-18.01', 'O02 10.00-19.01', 'O03 10.00-22.01', 'O04 09.00-23.01',
            'O19 19.00-07.01', 'O01 09.00-18.02', 'O02 10.00-19.02', 'O03 10.00-22.02', 'O04 09.00-23.02',
            'O19 19.00-07.02', 'O01 09.00-18.03', 'O01 09.00-18.02', 'O02 10.00-19.02', 'O03 10.00-22.02',
            'O04 09.00-23.02', 'O01 09.00-18.01', 'O02 10.00-19.01', 'O03 10.00-22.01', 'O04 09.00-23.01',
            'O19 19.00-07.01'
        ];
        return shifts[Math.floor(Math.random() * shifts.length)];
    }

    getMockAllowanceLogs(month: number, year: number): Observable<any[]> {
        const days = this.generateDays(month, year);
        const results = days.map(date => {
            const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            // สุ่มค่า
            const dayType = isWeekend ? 'H' : 'W';

            let timeIn = '';
            let timeOut = '';
            let description = '';

            if (dayType === 'W') {
                // สุ่มเวลาเข้า-ออกงาน

                const startHour = 8 + Math.floor(Math.random() * 2); // 8 or 9
                const startMinute = Math.floor(Math.random() * 60);
                const endHour = 17 + Math.floor(Math.random() * 4); // 17 - 20
                const endMinute = Math.floor(Math.random() * 60);

                timeIn = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
                timeOut = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

                // สุ่มใส่รายละเอียด
                if (Math.random() > 0.7) description = 'ทดสอบการเบิก';
            }

            return {
                date: this.formatDate(date),
                dayType: dayType,
                timeIn: timeIn,
                timeOut: timeOut,
                selected: false,
                description: description,
                shiftCode: this.getRandomShiftCode()
            };
        });
        return of(results).pipe(delay(200));
    }

    getMockAttendanceLogs(month: number, year: number): Observable<any[]> {
        const days = this.generateDays(month, year);
        const results = days.map(date => {
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const dayType = isWeekend ? 'H' : 'W';

            let timeIn = '';
            let timeOut = '';
            let description = '';

            if (dayType === 'W') {
                // สุ่มสถานะการเข้างาน (มาสาย/กลับดึก)
                const scenario = Math.random();
                if (scenario > 0.9) {
                    // Late night
                    timeIn = '09:00';
                    timeOut = '23:30';
                    description = 'กลับดึก';
                } else if (scenario > 0.8) {
                    // Early bird
                    timeIn = '05:30';
                    timeOut = '18:00';
                    description = 'มาเช้า';
                } else {
                    // Normal
                    const inHour = 8 + Math.floor(Math.random() * 2);
                    const inMin = Math.floor(Math.random() * 60);
                    const outHour = 17 + Math.floor(Math.random() * 2);
                    const outMin = Math.floor(Math.random() * 60);
                    timeIn = `${String(inHour).padStart(2, '0')}:${String(inMin).padStart(2, '0')}`;
                    timeOut = `${String(outHour).padStart(2, '0')}:${String(outMin).padStart(2, '0')}`;
                }
            }

            return {
                date: this.formatDate(date),
                dayType: dayType,
                timeIn: timeIn,
                timeOut: timeOut,
                selected: false,
                description: description,
                shiftCode: this.getRandomShiftCode()
            };
        });
        return of(results).pipe(delay(200));
    }

    getMockTaxiLogs(month: number, year: number): Observable<any[]> {
        const days = this.generateDays(month, year);
        const results = days.map(date => {
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
                date: this.formatDate(date),
                dayType: dayType,
                checkIn: checkIn,
                checkOut: checkOut,
                description: '',
                destination: '',
                distance: 0,
                amount: 0,
                selected: false,
                shiftCode: this.getRandomShiftCode()
            };
        });
        return of(results).pipe(delay(200));
    }
}
