import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject, delay } from 'rxjs';
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
     * สร้างข้อมูลจำลองสำหรับค่ารักษาพยาบาลแบบสุ่ม
     * @param count จำนวนรายการที่ต้องการสร้าง
     */
    private generateMockMedicalRequests(count: number = 20): MedicalRequest[] {
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
            'ผู้ป่วยนอก',
            'ทันตกรรม',
            'สายตา',
            'ผู้ป่วยใน'
        ];

        for (let i = 1; i <= count; i++) {
            const dateStr = this.vehicleService.getRandomDateInPast3Months();
            const createDateObj = new Date(dateStr);
            const status = this.vehicleService.getRandomStatus('vehicle'); // ใช้ร่วมกับ vehicle ได้

            const itemsCount = Math.floor(Math.random() * 2) + 1; // 1-2 items per request
            const items: MedicalItem[] = [];

            for (let j = 0; j < itemsCount; j++) {
                const treatmentDate = new Date(createDateObj);
                treatmentDate.setDate(treatmentDate.getDate() - Math.floor(Math.random() * 3));

                const treatmentDateStr = treatmentDate.toISOString().split('T')[0];
                const [y, m, d] = treatmentDateStr.split('-');
                const formattedDate = `${d}/${m}/${y}`;

                const amount = Math.floor(Math.random() * 5000) + 300;
                const approvedAmount = status === 'อนุมัติแล้ว' ? amount : 0;

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
            }

            requests.push({
                id: `2701#${String(i).padStart(3, '0')}`,
                createDate: dateStr,
                status: status,
                requester: this.vehicleService.getRandomRequester(),
                items: items
            });
        }

        // เรียงลำดับตามวันที่สร้างล่าสุด
        return requests.sort((a, b) => b.createDate.localeCompare(a.createDate));
    }

    /**
     * ดึงรายการคำขอเบิกค่ารักษาพยาบาลทั้งหมด
     */
    getMedicalRequests(): Observable<MedicalRequest[]> {
        return this.medicalRequestsSubject.asObservable().pipe(delay(200));
    }
}
