import { Injectable, signal } from '@angular/core';

export interface RequestItem {
    date: string; // dd/MM/yyyy
    desc: string;
    amount: number;
}

export interface VehicleRequest {
    id: string; // e.g. 2701#001
    createDate: string; // yyyy-MM-dd
    status: string;
    items: RequestItem[];
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

@Injectable({
    providedIn: 'root'
})
export class VehicleService {
    // Centralized mock data
    private requests = signal<VehicleRequest[]>([
        {
            id: '2701#001',
            createDate: '2026-01-15',
            status: 'รอตรวจสอบ',
            items: [
                { date: '27/10/2026', desc: 'ถ่ายงานหลังรายการแฉ', amount: 120 },
                { date: '22/10/2026', desc: 'สแตนด์บายงาน', amount: 120 },
                { date: '15/10/2026', desc: 'ทดสอบการเบิก', amount: 120 },
                { date: '01/10/2026', desc: 'ทดสอบการเบิก', amount: 120 },
            ],
        },
        {
            id: '2701#002',
            createDate: '2026-01-17',
            status: 'ต้นสังกัดอนุมัติ',
            items: [
                { date: '27/10/2026', desc: 'ทดสอบ 1', amount: 120 },
                { date: '28/10/2026', desc: 'ทดสอบ 2', amount: 120 },
                { date: '29/10/2026', desc: 'ทดสอบ 3', amount: 120 },
                { date: '30/10/2026', desc: 'ทดสอบ 4', amount: 120 },
            ],
        }
    ]);

    getRequests() {
        return this.requests;
    }

    getRequestById(id: string): VehicleRequest | undefined {
        return this.requests().find(r => r.id === id);
    }

    addRequest(request: VehicleRequest) {
        this.requests.update(active => [request, ...active]);
    }

    updateRequest(id: string, updatedRequest: VehicleRequest) {
        this.requests.update(active => active.map(r => r.id === id ? updatedRequest : r));
    }

    deleteRequest(id: string) {
        this.requests.update(active => active.filter(r => r.id !== id));
    }

    // Generate mock running number
    generateNextId(): string {
        const lastIdNum = this.requests().reduce((max, item) => {
            const num = parseInt(item.id.split('#')[1] || '0');
            return num > max ? num : max;
        }, 0);
        const nextNum = (lastIdNum + 1).toString().padStart(3, '0');
        return `2701#${nextNum}`;
    }

    // Mock Attendance Data (moved from vehicle-form)
    // In a real app, this would fetch from an API based on employee ID and month/year
    getMockAttendanceLogs(month: number, year: number): any[] {
        // Return the same hardcoded data for now, but exposed via service
        return [
            { d: '01/10/2025', t: 'W', in: '09:14', out: '23:30', s: false, desc: 'แชร์ค่าแท็กซี่กลับบ้าน (เลิกงานดึก)' },
            { d: '02/10/2025', t: 'W', in: '05:30', out: '18:00', s: false, desc: 'เรียก Grab มาทำงาน (เข้างานเช้า)' },
            { d: '03/10/2025', t: 'W', in: '09:34', out: '18:15', s: false, desc: '' },
            { d: '04/10/2025', t: 'H', in: '', out: '', s: false, desc: '' },
            { d: '05/10/2025', t: 'H', in: '', out: '', s: false, desc: '' },
            { d: '06/10/2025', t: 'W', in: '09:20', out: '18:10', s: false, desc: '' },
            { d: '07/10/2025', t: 'W', in: '09:15', out: '18:22', s: false, desc: '' },
            { d: '08/10/2025', t: 'W', in: '09:26', out: '18:22', s: false, desc: '' },
            { d: '09/10/2025', t: 'W', in: '09:22', out: '18:13', s: false, desc: '' },
            { d: '10/10/2025', t: 'W', in: '08:58', out: '18:14', s: false, desc: '' },
            { d: '11/10/2025', t: 'H', in: '', out: '', s: false, desc: '' },
            { d: '12/10/2025', t: 'H', in: '', out: '', s: false, desc: '' },
            { d: '13/10/2025', t: 'T', in: '', out: '', s: false, desc: '' },
            { d: '14/10/2025', t: 'W', in: '09:24', out: '18:39', s: false, desc: '' },
            { d: '15/10/2025', t: 'W', in: '09:12', out: '17:40', s: false, desc: '' },
            { d: '16/10/2025', t: 'W', in: '09:17', out: '18:27', s: false, desc: '' },
            { d: '17/10/2025', t: 'W', in: '11:19', out: '16:59', s: false, desc: '' },
            { d: '18/10/2025', t: 'H', in: '', out: '', s: false, desc: '' },
            { d: '19/10/2025', t: 'H', in: '', out: '', s: false, desc: '' },
            { d: '20/10/2025', t: 'W', in: '09:19', out: '15:55', s: false, desc: '' },
            { d: '21/10/2025', t: 'W', in: '09:17', out: '18:36', s: false, desc: '' },
            { d: '22/10/2025', t: 'W', in: '09:46', out: '18:05', s: false, desc: '' },
            { d: '23/10/2025', t: 'T', in: '', out: '', s: false, desc: '' },
            { d: '24/10/2025', t: 'L', in: '', out: '', s: false, desc: '' },
            { d: '25/10/2025', t: 'H', in: '', out: '', s: false, desc: '' },
            { d: '26/10/2025', t: 'H', in: '', out: '', s: false, desc: '' },
            { d: '27/10/2025', t: 'W', in: '09:31', out: '22:15', s: false, desc: '' },
            { d: '28/10/2025', t: 'W', in: '09:52', out: '18:39', s: false, desc: '' },
            { d: '29/10/2025', t: 'W', in: '09:37', out: '18:13', s: false, desc: '' },
            { d: '30/10/2025', t: 'W', in: '09:44', out: '18:51', s: false, desc: '' },
            { d: '31/10/2025', t: 'W', in: '09:39', out: '18:09', s: false, desc: '' }
        ];
    }

    // --- TAXI SECTION ---

    private taxiRequests = signal<TaxiRequest[]>([
        {
            id: '2701#001',
            createDate: '15/01/2026',
            status: 'รอตรวจสอบ',
            items: [
                { date: '27/10/2026', desc: 'ถ่ายงานหลังรายการแฉ', destination: 'Bravo Studio', distance: 10.00, amount: 120 },
                { date: '22/10/2026', desc: 'สแตนด์บายงาน', destination: 'GMM Studio', distance: 4.50, amount: 120 },
                { date: '15/10/2026', desc: 'ทดสอบการเบิก', destination: 'สักที่', distance: 2.00, amount: 120 },
                { date: '01/10/2026', desc: 'ทดสอบการเบิก', destination: 'สักแห่ง', distance: 5.00, amount: 120 }
            ]
        },
        {
            id: '2701#002',
            createDate: '17/01/2026',
            status: 'ต้นสังกัดอนุมัติ',
            items: [
                { date: '27/10/2026', desc: 'ทดสอบ1', destination: 'สักหน', distance: 6.25, amount: 120 },
                { date: '28/10/2026', desc: 'ทดสอบ2', destination: 'Some where', distance: 7.75, amount: 120 },
                { date: '29/10/2026', desc: 'ทดสอบ3', destination: 'ไปห้าง', distance: 100.00, amount: 120 },
                { date: '30/10/2026', desc: 'ทดสอบ4', destination: 'ไปสวนสัตว์', distance: 1.00, amount: 120 }
            ]
        }
    ]);

    getTaxiRequests() {
        return this.taxiRequests;
    }

    getTaxiRequestById(id: string): TaxiRequest | undefined {
        return this.taxiRequests().find(r => r.id === id);
    }

    addTaxiRequest(request: TaxiRequest) {
        this.taxiRequests.update(active => [request, ...active]);
    }

    updateTaxiRequest(id: string, updatedRequest: TaxiRequest) {
        this.taxiRequests.update(active => active.map(r => r.id === id ? updatedRequest : r));
    }

    deleteTaxiRequest(id: string) {
        this.taxiRequests.update(active => active.filter(r => r.id !== id));
    }

    generateNextTaxiId(): string {
        const lastIdNum = this.taxiRequests().reduce((max, item) => {
            const num = parseInt(item.id.split('#')[1] || '0');
            return num > max ? num : max;
        }, 0);
        const nextNum = (lastIdNum + 1).toString().padStart(3, '0');
        return `2701#${nextNum}`;
    }

    // Mock Taxi Logs (for form calendar/list)
    // Reusing similar structure to attendance, but for Taxi Form usage
    getMockTaxiLogs(month: number, year: number): any[] {
        return [
            { date: '01/10/2025', type: 'W', checkIn: '09:14', checkOut: '17:56', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '02/10/2025', type: 'W', checkIn: '09:16', checkOut: '18:16', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '03/10/2025', type: 'W', checkIn: '09:34', checkOut: '18:15', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '04/10/2025', type: 'H', checkIn: '', checkOut: '', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '05/10/2025', type: 'H', checkIn: '', checkOut: '', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '06/10/2025', type: 'W', checkIn: '09:20', checkOut: '18:10', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '07/10/2025', type: 'W', checkIn: '09:15', checkOut: '18:22', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '08/10/2025', type: 'W', checkIn: '09:26', checkOut: '18:22', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '09/10/2025', type: 'W', checkIn: '09:22', checkOut: '18:13', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '10/10/2025', type: 'W', checkIn: '08:58', checkOut: '18:14', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '11/10/2025', type: 'H', checkIn: '', checkOut: '', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '12/10/2025', type: 'H', checkIn: '', checkOut: '', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '13/10/2025', type: 'T', checkIn: '', checkOut: '', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '14/10/2025', type: 'W', checkIn: '09:24', checkOut: '18:39', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '15/10/2025', type: 'W', checkIn: '09:12', checkOut: '17:40', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '16/10/2025', type: 'W', checkIn: '09:17', checkOut: '18:27', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '17/10/2025', type: 'W', checkIn: '11:19', checkOut: '16:59', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '18/10/2025', type: 'H', checkIn: '', checkOut: '', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '19/10/2025', type: 'H', checkIn: '', checkOut: '', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '20/10/2025', type: 'W', checkIn: '09:19', checkOut: '15:55', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '21/10/2025', type: 'W', checkIn: '09:17', checkOut: '18:36', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '22/10/2025', type: 'W', checkIn: '09:46', checkOut: '18:05', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '23/10/2025', type: 'T', checkIn: '', checkOut: '', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '24/10/2025', type: 'L', checkIn: '', checkOut: '', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '25/10/2025', type: 'H', checkIn: '', checkOut: '', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '26/10/2025', type: 'H', checkIn: '', checkOut: '', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '27/10/2025', type: 'W', checkIn: '09:31', checkOut: '18:15', desc: 'ทดสอบการเบิก', dest: 'ทดสอบการเบิก', dist: 0, amt: 0, selected: false },
            { date: '28/10/2025', type: 'W', checkIn: '09:52', checkOut: '18:39', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '29/10/2025', type: 'W', checkIn: '09:37', checkOut: '18:13', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '30/10/2025', type: 'W', checkIn: '09:44', checkOut: '18:51', desc: '', dest: '', dist: 0, amt: 0, selected: false },
            { date: '31/10/2025', type: 'W', checkIn: '09:39', checkOut: '18:09', desc: '', dest: '', dist: 0, amt: 0, selected: false }
        ];
    }

    // --- ALLOWANCE SECTION ---

    private allowanceRequests = signal<AllowanceRequest[]>([
        {
            id: '2701-001',
            createDate: '2026-01-15',
            status: 'รอตรวจสอบ',
            items: [
                { date: '27/10/2025', dayType: 'W', timeIn: '09:00', timeOut: '20:00', description: 'ถ่ายงาน A', hours: 2, amount: 150, selected: true },
                { date: '28/10/2025', dayType: 'W', timeIn: '09:00', timeOut: '20:00', description: 'ถ่ายงาน B', hours: 2, amount: 150, selected: true },
                { date: '29/10/2025', dayType: 'W', timeIn: '09:00', timeOut: '20:00', description: 'ถ่ายงาน C', hours: 2, amount: 150, selected: true },
            ],
        },
        {
            id: '2701-002',
            createDate: '2026-01-16',
            status: 'ต้นสังกัดอนุมัติ',
            items: [
                { date: '22/10/2025', dayType: 'W', timeIn: '09:00', timeOut: '23:00', description: 'สแตนด์บายงาน', hours: 5, amount: 500, selected: true },
                { date: '27/10/2025', dayType: 'W', timeIn: '09:00', timeOut: '20:00', description: 'ถ่ายงาน D', hours: 2, amount: 150, selected: true },
            ],
        },
        {
            id: '2701-003',
            createDate: '2026-01-17',
            status: 'รอจ่าย',
            items: [
                { date: '15/10/2025', dayType: 'W', timeIn: '09:00', timeOut: '19:00', description: 'ทดสอบการเบิก', hours: 1, amount: 100, selected: true },
            ],
        },
        {
            id: '2701-004',
            createDate: '2026-01-16',
            status: 'จ่ายแล้ว',
            items: [
                { date: '10/01/2025', dayType: 'W', timeIn: '09:00', timeOut: '20:00', description: 'Test 1', hours: 2, amount: 150, selected: true },
                { date: '27/10/2025', dayType: 'W', timeIn: '09:00', timeOut: '20:00', description: 'Test 2', hours: 2, amount: 150, selected: true },
            ],
        },
    ]);

    getAllowanceRequests() {
        return this.allowanceRequests;
    }

    getAllowanceRequestById(id: string): AllowanceRequest | undefined {
        return this.allowanceRequests().find(r => r.id === id);
    }

    addAllowanceRequest(request: AllowanceRequest) {
        this.allowanceRequests.update(active => [request, ...active]);
    }

    updateAllowanceRequest(id: string, updatedRequest: AllowanceRequest) {
        this.allowanceRequests.update(active => active.map(r => r.id === id ? updatedRequest : r));
    }

    deleteAllowanceRequest(id: string) {
        this.allowanceRequests.update(active => active.filter(r => r.id !== id));
    }

    generateNextAllowanceId(): string {
        const prefix = '2701';
        const lastIdNum = this.allowanceRequests().reduce((max, item) => {
            if (item.id.startsWith(prefix)) {
                const parts = item.id.split('-');
                const num = parseInt(parts[1] || '0');
                return num > max ? num : max;
            }
            return max;
        }, 0);

        return `${prefix}-${(lastIdNum + 1).toString().padStart(3, '0')}`;
    }

    getMockAllowanceLogs(month: number, year: number): any[] {
        return [
            { d: '01/10/2025', t: 'W', in: '09:14', out: '20:00', s: false, desc: 'ถ่ายงานหลังรายการแฉ' },
            { d: '02/10/2025', t: 'W', in: '09:16', out: '23:00', s: false, desc: 'สแตนด์บายงาน' },
            { d: '03/10/2025', t: 'W', in: '09:34', out: '18:15', s: false, desc: '' },
            { d: '04/10/2025', t: 'H', in: '', out: '', s: false, desc: '' },
            { d: '05/10/2025', t: 'H', in: '', out: '', s: false, desc: '' },
            { d: '06/10/2025', t: 'W', in: '09:20', out: '18:10', s: false, desc: '' },
            { d: '07/10/2025', t: 'W', in: '09:15', out: '18:22', s: false, desc: '' },
            { d: '08/10/2025', t: 'W', in: '09:26', out: '18:22', s: false, desc: '' },
            { d: '09/10/2025', t: 'W', in: '09:22', out: '18:13', s: false, desc: '' },
            { d: '10/10/2025', t: 'W', in: '08:58', out: '18:14', s: false, desc: '' },
            { d: '11/10/2025', t: 'H', in: '', out: '', s: false, desc: '' },
            { d: '12/10/2025', t: 'H', in: '', out: '', s: false, desc: '' },
            { d: '13/10/2025', t: 'T', in: '', out: '', s: false, desc: '' },
            { d: '14/10/2025', t: 'W', in: '09:24', out: '18:39', s: false, desc: '' },
            { d: '15/10/2025', t: 'W', in: '09:12', out: '17:40', s: false, desc: '' },
            { d: '16/10/2025', t: 'W', in: '09:17', out: '18:27', s: false, desc: '' },
            { d: '17/10/2025', t: 'W', in: '11:19', out: '16:59', s: false, desc: '' },
            { d: '18/10/2025', t: 'H', in: '', out: '', s: false, desc: '' },
            { d: '19/10/2025', t: 'H', in: '', out: '', s: false, desc: '' },
            { d: '20/10/2025', t: 'W', in: '09:19', out: '15:55', s: false, desc: '' },
            { d: '21/10/2025', t: 'W', in: '09:17', out: '18:36', s: false, desc: '' },
            { d: '22/10/2025', t: 'W', in: '09:46', out: '18:05', s: false, desc: '' },
            { d: '23/10/2025', t: 'T', in: '', out: '', s: false, desc: '' },
            { d: '24/10/2025', t: 'L', in: '', out: '', s: false, desc: '' },
            { d: '25/10/2025', t: 'H', in: '', out: '', s: false, desc: '' },
            { d: '26/10/2025', t: 'H', in: '', out: '', s: false, desc: '' },
            { d: '27/10/2025', t: 'W', in: '09:31', out: '18:15', s: false, desc: 'ทดสอบการเบิก' },
            { d: '28/10/2025', t: 'W', in: '09:52', out: '18:39', s: false, desc: '' },
            { d: '29/10/2025', t: 'W', in: '09:37', out: '18:13', s: false, desc: '' },
            { d: '30/10/2025', t: 'W', in: '09:44', out: '18:51', s: false, desc: '' },
            { d: '31/10/2025', t: 'W', in: '09:39', out: '18:09', s: false, desc: '' }
        ];
    }
}

export interface TaxiItem {
    date: string;
    desc: string;
    destination: string;
    distance: number;
    amount: number;
    // For UI convenience in mapping
    attachedFile?: string | null;
}

export interface TaxiRequest {
    id: string; // 2701#xxx
    createDate: string; // dd/MM/yyyy
    status: string;
    items: TaxiItem[];
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
}

export interface AllowanceRequest {
    id: string; // 2701-xxx
    createDate: string;
    status: string;
    items: AllowanceItem[];
}
