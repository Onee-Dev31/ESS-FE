import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject, forkJoin, map } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Requester, VehicleService } from './vehicle.service';

/**
 * อินเตอร์เฟสสำหรับรายการค่ารักษาพยาบาล
 */
export interface MedicalItem {
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
}

@Injectable({
    providedIn: 'root'
})
export class MedicalexpensesService {
    private vehicleService = inject(VehicleService);

    // จำลองฐานข้อมูลสำหรับค่ารักษาพยาบาล
    private medicalRequestsMock: MedicalRequest[] = this.generateMockMedicalRequests();

    // ตัวแปรสำหรับกระจายข้อมูล (State Management)
    private medicalRequestsSubject = new BehaviorSubject<MedicalRequest[]>(this.medicalRequestsMock);

    constructor() { }

    /**
     * สร้างข้อมูลจำลองสำหรับค่ารักษาพยาบาล
     */
    private generateMockMedicalRequests(): MedicalRequest[] {
        return [
            {
                id: '2701#001',
                createDate: '2025-03-10',
                status: 'อนุมัติแล้ว',
                requester: this.vehicleService.getRandomRequester(),
                items: [
                    {
                        requestDate: '10/03/2025',
                        limitType: 'ผู้ป่วยนอก,ทันตกรรม,สายตา',
                        diseaseType: 'เอ็นอักเสบ',
                        hospital: 'สินแพทย์ รพ.',
                        treatmentDateFrom: '09/03/2025',
                        treatmentDateTo: '09/03/2025',
                        requestedAmount: 2034,
                        approvedAmount: 2034
                    }
                ]
            },
            {
                id: '2701#002',
                createDate: '2025-08-15',
                status: 'อนุมัติแล้ว',
                requester: this.vehicleService.getRandomRequester(),
                items: [
                    {
                        requestDate: '15/08/2025',
                        limitType: 'ผู้ป่วยนอก,ทันตกรรม,สายตา',
                        diseaseType: 'เนื้อเยื่อช้ำ',
                        hospital: 'สินแพทย์ รพ.',
                        treatmentDateFrom: '15/08/2025',
                        treatmentDateTo: '15/08/2025',
                        requestedAmount: 1527,
                        approvedAmount: 1527
                    }
                ]
            },
            {
                id: '2701#003',
                createDate: '2025-11-20',
                status: 'อนุมัติแล้ว',
                requester: this.vehicleService.getRandomRequester(),
                items: [
                    {
                        requestDate: '20/11/2025',
                        limitType: 'ผู้ป่วยนอก,ทันตกรรม,สายตา',
                        diseaseType: 'ไข้หวัดใหญ่',
                        hospital: 'สินแพทย์ รพ.',
                        treatmentDateFrom: '16/11/2025',
                        treatmentDateTo: '16/11/2025',
                        requestedAmount: 2560,
                        approvedAmount: 2560
                    }
                ]
            }
        ];
    }

    /**
     * ดึงรายการคำขอเบิกค่ารักษาพยาบาลทั้งหมด
     */
    getMedicalRequests(): Observable<MedicalRequest[]> {
        return this.medicalRequestsSubject.asObservable().pipe(delay(200));
    }
}
