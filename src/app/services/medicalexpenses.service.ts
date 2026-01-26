import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject, delay } from 'rxjs';
import { Requester, VehicleService } from './vehicle.service';

/**
 * อินเตอร์เฟสสำหรับรายการค่ารักษาพยาบาล
 */
export interface MedicalItem {
    id?: string;
    requestDate: string;
    limitType: string;
    diseaseType: string;
    hospital: string;
    treatmentDateFrom: string;
    treatmentDateTo: string;
    requestedAmount: number;
    approvedAmount: number;
}

/**
 * อินเตอร์เฟสสำหรับคำขอเบิกค่ารักษาพยาบาล
 */
export interface MedicalRequest {
    id: string; // เช่น 2701#xxx
    createDate: string;
    status: string;
    items: MedicalItem[];
    requester?: Requester;
    employeeId?: string;
    totalRequestedAmount?: number;
    totalApprovedAmount?: number;
}

@Injectable({
    providedIn: 'root'
})
export class MedicalexpensesService {
    private vehicleService = inject(VehicleService);

    // จำลองฐานข้อมูลสำหรับค่ารักษาพยาบาล
    private medicalRequestsMock: MedicalRequest[] = this.generateMockMedicalRequests(15);

    // ตัวแปรสำหรับกระจายข้อมูล (State Management)
    private medicalRequestsSubject = new BehaviorSubject<MedicalRequest[]>(this.medicalRequestsMock);

    constructor() { }

    private generateMockMedicalRequests(count: number): MedicalRequest[] {
        const requests: MedicalRequest[] = [];
        const diseaseTypes = [
            'เอ็นอักเสบ', 'เนื้อเยื่อช้ำ', 'ไข้หวัดใหญ่', 'ปวดฟัน/อุดฟัน', 'ตรวจสุขภาพประจำปี',
            'ปวดศีรษะ', 'ผื่นคัน', 'ตาอักเสบ', 'ท้องเสีย', 'ปวดหลัง', 'นิ้วล็อค'
        ];
        const hospitals = [
            'สินแพทย์ รพ.', 'พญาไท รพ.', 'เปาโล รพ.', 'วิภาวดี รพ.', 'สมิติเวช รพ.',
            'คลินิกทันตกรรมสไมล์', 'คลินิกเวชกรรมอินเตอร์', 'รพ.กรุงเทพ', 'รพ.รามาธิบดี'
        ];
        const limitTypes = [
            'ผู้ป่วยนอก (OPD)',
            'ทันตกรรม',
            'สายตา',
            'ผู้ป่วยใน'
        ];

        for (let i = 1; i <= count; i++) {
            const dateStr = this.vehicleService.getRandomDateInPast3Months();
            const createDateObj = new Date(dateStr);
            const status = this.vehicleService.getRandomStatus('vehicle');

            const items: MedicalItem[] = [];
            const requestId = `2701#${String(i).padStart(3, '0')}`;

            const treatmentDate = new Date(createDateObj);
            treatmentDate.setDate(treatmentDate.getDate() - Math.floor(Math.random() * 3));

            const treatmentDateStr = treatmentDate.toISOString().split('T')[0];
            const [y, m, d] = treatmentDateStr.split('-');
            const formattedDate = `${d}/${m}/${y}`;

            const amount = Math.floor(Math.random() * 5000) + 300;
            const approvedAmount = status === 'อนุมัติแล้ว' ? amount : (status === 'รออนุมัติ' ? 0 : Math.floor(amount * 0.8));

            items.push({
                requestDate: formattedDate,
                limitType: limitTypes[Math.floor(Math.random() * limitTypes.length)],
                diseaseType: diseaseTypes[Math.floor(Math.random() * diseaseTypes.length)],
                hospital: hospitals[Math.floor(Math.random() * hospitals.length)],
                treatmentDateFrom: formattedDate,
                treatmentDateTo: formattedDate,
                requestedAmount: amount,
                approvedAmount: approvedAmount
            });

            requests.push({
                id: requestId,
                createDate: dateStr,
                status: status,
                requester: this.vehicleService.getRandomRequester(),
                employeeId: 'EMP001',
                items: items,
                totalRequestedAmount: amount,
                totalApprovedAmount: approvedAmount
            });
        }

        // เรียงลำดับตามเลขที่เอกสารใหม่ล่าสุด (Descending)
        return requests.sort((a, b) => b.id.localeCompare(a.id));
    }

    /**
     * ดึงรายการคำขอเบิกค่ารักษาพยาบาลทั้งหมด
     */
    getMedicalRequests(): Observable<MedicalRequest[]> {
        return this.medicalRequestsSubject.asObservable().pipe(delay(200));
    }

    /**
     * ดึงข้อมูลคำขอเบิกตาม ID
     */
    getRequestById(id: string): Observable<MedicalRequest | undefined> {
        const request = this.medicalRequestsMock.find(r => r.id === id);
        return of(request).pipe(delay(200));
    }

    /**
     * สร้างเลขที่เอกสารใหม่ (เช่น 2701#021)
     */
    generateNextMedicalId(): Observable<string> {
        const prefix = '2701';

        const ids = this.medicalRequestsMock
            .filter(r => r.id.startsWith(prefix))
            .map(r => {
                const parts = r.id.split('#');
                return parts.length > 1 ? parseInt(parts[1]) : 0;
            })
            .sort((a, b) => b - a);

        const nextNum = ids.length > 0 ? ids[0] + 1 : 1;
        const nextId = `${prefix}#${String(nextNum).padStart(3, '0')}`;
        return of(nextId).pipe(delay(200));
    }

    /**
     * เพิ่มรายการคำขอใหม่
     */
    addRequest(request: MedicalRequest): Observable<void> {
        this.medicalRequestsMock.unshift(request);
        // เรียงลำดับใหม่เสมอตาม ID
        this.medicalRequestsMock.sort((a, b) => b.id.localeCompare(a.id));
        this.medicalRequestsSubject.next([...this.medicalRequestsMock]);
        return of(undefined).pipe(delay(500));
    }

    /**
     * อัปเดตรายการคำขอเดิม
     */
    updateRequest(request: MedicalRequest): Observable<void> {
        const index = this.medicalRequestsMock.findIndex(r => r.id === request.id);
        if (index !== -1) {
            this.medicalRequestsMock[index] = request;
            this.medicalRequestsSubject.next([...this.medicalRequestsMock]);
        }
        return of(undefined).pipe(delay(500));
    }
}
