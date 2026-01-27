import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject, delay } from 'rxjs';
import { Requester, VehicleService } from './vehicle.service';

// รายการค่ารักษาพยาบาล
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

// คำขอค่ารักษาพยาบาล
export interface MedicalRequest {
    id: string;
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

    private medicalRequestsMock: MedicalRequest[] = this.generateMockMedicalRequests(15);

    private medicalRequestsSubject = new BehaviorSubject<MedicalRequest[]>(this.medicalRequestsMock);

    constructor() { }

    // สร้างข้อมูลจำลองคำขอค่ารักษาพยาบาล
    private generateMockMedicalRequests(count: number): MedicalRequest[] {
        const diseaseTypes = ['เอ็นอักเสบ', 'ไข้หวัดใหญ่', 'ปวดฟัน/อุดฟัน', 'ปวดศีรษะ', 'ท้องเสีย'];
        const hospitals = ['สินแพทย์ รพ.', 'พญาไท รพ.', 'เปาโล รพ.', 'รพ.กรุงเทพ'];
        const limitTypes = ['ผู้ป่วยนอก (OPD)', 'ทันตกรรม', 'สายตา', 'ผู้ป่วยใน'];

        return Array.from({ length: count }, (_, i) => {
            const dateStr = this.vehicleService.getRandomDateInPast3Months();
            const status = this.vehicleService.getRandomStatus('vehicle');
            const amount = Math.floor(Math.random() * 5000) + 300;
            const approvedAmount = status === 'อนุมัติแล้ว' ? amount : (status === 'รออนุมัติ' ? 0 : Math.floor(amount * 0.8));

            const [y, m, d] = dateStr.split('-');
            const formattedDate = `${d}/${m}/${y}`;

            return {
                id: `2701#${String(i + 1).padStart(3, '0')}`,
                createDate: dateStr,
                status: status,
                requester: this.vehicleService.getRandomRequester(),
                employeeId: 'EMP001',
                items: [{
                    requestDate: formattedDate,
                    limitType: limitTypes[Math.floor(Math.random() * limitTypes.length)],
                    diseaseType: diseaseTypes[Math.floor(Math.random() * diseaseTypes.length)],
                    hospital: hospitals[Math.floor(Math.random() * hospitals.length)],
                    treatmentDateFrom: formattedDate,
                    treatmentDateTo: formattedDate,
                    requestedAmount: amount,
                    approvedAmount: approvedAmount
                }],
                totalRequestedAmount: amount,
                totalApprovedAmount: approvedAmount
            };
        }).sort((a, b) => b.id.localeCompare(a.id));
    }

    // ดึงข้อมูลคำขอค่ารักษาพยาบาลทั้งหมด
    getMedicalRequests(): Observable<MedicalRequest[]> {
        return this.medicalRequestsSubject.asObservable().pipe(delay(200));
    }

    // ดึงข้อมูลตาม ID
    getRequestById(id: string): Observable<MedicalRequest | undefined> {
        const request = this.medicalRequestsMock.find(r => r.id === id);
        return of(request).pipe(delay(200));
    }

    // สร้างรหัสคำขอถัดไป
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

    // เพิ่มคำขอใหม่
    addRequest(request: MedicalRequest): Observable<void> {
        this.medicalRequestsMock.unshift(request);
        this.medicalRequestsMock.sort((a, b) => b.id.localeCompare(a.id));
        this.medicalRequestsSubject.next([...this.medicalRequestsMock]);
        return of(undefined).pipe(delay(500));
    }

    // อัปเดตข้อมูลคำขอ
    updateRequest(request: MedicalRequest): Observable<void> {
        const index = this.medicalRequestsMock.findIndex(r => r.id === request.id);
        if (index !== -1) {
            this.medicalRequestsMock[index] = request;
            this.medicalRequestsSubject.next([...this.medicalRequestsMock]);
        }
        return of(undefined).pipe(delay(500));
    }
}

