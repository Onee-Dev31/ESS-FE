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
    date: string; // dd/MM/yyyy
    desc: string;
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
    id: string; // e.g. 2701#001
    typeId: number;
    createDate: string; // yyyy-MM-dd
    status: string;
    items: RequestItem[];
    requester?: Requester;
}

export interface AttendanceLog {
    date: string;
    dayType: string; // W, H, L, T
    timeIn: string;
    timeOut: string;
    amount: number;
    selected: boolean;
    description: string;
}

export interface TaxiItem {
    date: string;
    desc: string;
    destination: string;
    distance: number;
    amount: number;
    shiftCode?: string;
    // For UI convenience in mapping
    attachedFile?: string | null;
}

export interface TaxiRequest {
    id: string; // 2701#xxx
    typeId: number;
    createDate: string; // dd/MM/yyyy
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
    id: string; // 2701#xxx
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

    // --- ส่วนสร้างข้อมูลจำลอง ---

    private getRandomStatus(type: 'allowance' | 'taxi' | 'vehicle'): string {
        let statuses: string[] = [];
        if (type === 'allowance') {
            statuses = ['รอตรวจสอบ', 'ต้นสังกัดอนุมัติ', 'รอจ่าย', 'จ่ายแล้ว'];
        } else {
            // vehicle and taxi
            statuses = ['รอตรวจสอบ', 'ต้นสังกัดอนุมัติ', 'HR อนุมัติ', 'CEO อนุมัติ', 'ACC อนุมัติ'];
        }
        return statuses[Math.floor(Math.random() * statuses.length)];
    }

    private getRandomDateInPast3Months(): string {
        const today = new Date();
        const past = new Date();
        past.setMonth(today.getMonth() - 3);
        const randomTime = past.getTime() + Math.random() * (today.getTime() - past.getTime());
        const d = new Date(randomTime);
        // แปลงวันที่เป็น YYYY-MM-DD


        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
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
        const reqs: VehicleRequest[] = [];
        for (let i = 1; i <= count; i++) {
            const dateStr = this.getRandomDateInPast3Months();
            reqs.push({
                id: `2701#${String(i).padStart(3, '0')}`,
                typeId: WELFARE_TYPES.TRANSPORT,
                createDate: dateStr,
                status: this.getRandomStatus('vehicle'),
                requester: this.getRandomRequester(),
                items: [
                    { date: '2026-01-01', desc: 'Mock Item 1', amount: 150, shiftCode: 'O01 09.00-18.00' },
                    { date: '2026-01-02', desc: 'Mock Item 2', amount: 150, shiftCode: 'O01 09.00-18.00' },
                    { date: '2026-01-03', desc: 'Mock Item 3', amount: 150, shiftCode: 'O01 09.00-18.00' }
                ]
            });
        }
        return reqs;
    }

    private generateMockTaxiRequests(count: number): TaxiRequest[] {
        const reqs: TaxiRequest[] = [];
        for (let i = 1; i <= count; i++) {
            const d = new Date();
            d.setDate(d.getDate() - Math.floor(Math.random() * 60));
            const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

            reqs.push({
                id: `2701#${String(i).padStart(3, '0')}`,
                typeId: WELFARE_TYPES.TAXI,
                createDate: dateStr,
                status: this.getRandomStatus('taxi'),
                requester: this.getRandomRequester(),
                items: [
                    { date: dateStr, desc: 'เดินทางไปหาลูกค้า A', destination: 'GMM Grammy', distance: 12.5, amount: 250, shiftCode: 'O01 09.00-18.00' },
                    { date: dateStr, desc: 'กลับจากหาลูกค้า A', destination: 'Office', distance: 12.5, amount: 230, shiftCode: 'O01 09.00-18.00' }
                ]
            });
        }
        return reqs;
    }

    private generateMockAllowanceRequests(count: number): AllowanceRequest[] {
        const reqs: AllowanceRequest[] = [];
        for (let i = 1; i <= count; i++) {
            const dateStr = this.getRandomDateInPast3Months();
            reqs.push({
                id: `2701#${String(i).padStart(3, '0')}`,
                typeId: WELFARE_TYPES.ALLOWANCE,
                createDate: dateStr,
                status: this.getRandomStatus('allowance'),
                requester: this.getRandomRequester(),
                items: [
                    { date: '2026-01-10', dayType: 'W', timeIn: '09:00', timeOut: '21:00', description: 'ทำงานล่วงเวลาโปรเจค A', hours: 3, amount: 225, selected: true, shiftCode: 'O01 09.00-21.00' }
                ]
            });
        }
        return reqs;
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
                const p1 = reqs.filter(r => r.status.includes('รอตรวจสอบ')).length;
                const p2 = taxis.filter(t => t.status.includes('รอตรวจสอบ')).length;
                const p3 = allowances.filter(a => a.status.includes('รอตรวจสอบ')).length;
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
        const results = days.map(d => {
            const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            // สุ่มค่า
            const type = isWeekend ? 'H' : 'W';

            let timeIn = '';
            let timeOut = '';
            let desc = '';

            if (type === 'W') {
                // สุ่มเวลาเข้า-ออกงาน

                const inHour = 8 + Math.floor(Math.random() * 2); // 8 or 9
                const inMin = Math.floor(Math.random() * 60);
                const outHour = 17 + Math.floor(Math.random() * 4); // 17 - 20
                const outMin = Math.floor(Math.random() * 60);

                timeIn = `${String(inHour).padStart(2, '0')}:${String(inMin).padStart(2, '0')}`;
                timeOut = `${String(outHour).padStart(2, '0')}:${String(outMin).padStart(2, '0')}`;

                // สุ่มใส่รายละเอียด
                if (Math.random() > 0.7) desc = 'ทดสอบการเบิก';
            }

            return {
                d: this.formatDate(d),
                t: type,
                in: timeIn,
                out: timeOut,
                s: false,
                desc: desc,
                shiftCode: this.getRandomShiftCode()
            };
        });
        return of(results).pipe(delay(200));
    }

    getMockAttendanceLogs(month: number, year: number): Observable<any[]> {
        const days = this.generateDays(month, year);
        const results = days.map(d => {
            const dayOfWeek = d.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const type = isWeekend ? 'H' : 'W';

            let timeIn = '';
            let timeOut = '';
            let desc = '';

            if (type === 'W') {
                // สุ่มสถานะการเข้างาน (มาสาย/กลับดึก)
                const scenario = Math.random();
                if (scenario > 0.9) {
                    // Late night
                    timeIn = '09:00';
                    timeOut = '23:30';
                    desc = 'กลับดึก';
                } else if (scenario > 0.8) {
                    // Early bird
                    timeIn = '05:30';
                    timeOut = '18:00';
                    desc = 'มาเช้า';
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
                d: this.formatDate(d),
                t: type,
                in: timeIn,
                out: timeOut,
                s: false,
                desc: desc,
                shiftCode: this.getRandomShiftCode()
            };
        });
        return of(results).pipe(delay(200));
    }

    getMockTaxiLogs(month: number, year: number): Observable<any[]> {
        const days = this.generateDays(month, year);
        const results = days.map(d => {
            const dayOfWeek = d.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const type = isWeekend ? 'H' : 'W';

            let checkIn = '';
            let checkOut = '';

            if (type === 'W') {
                checkIn = `09:${String(Math.floor(Math.random() * 59)).padStart(2, '0')}`;
                checkOut = `18:${String(Math.floor(Math.random() * 59)).padStart(2, '0')}`;
            }

            return {
                date: this.formatDate(d),
                type: type,
                checkIn: checkIn,
                checkOut: checkOut,
                desc: '',
                dest: '',
                dist: 0,
                amt: 0,
                selected: false,
                shiftCode: this.getRandomShiftCode()
            };
        });
        return of(results).pipe(delay(200));
    }
}
