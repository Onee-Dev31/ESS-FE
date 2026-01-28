import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Requester } from '../interfaces';
import { MockHelper } from '../mocks';
import { StatusUtil } from '../utils/status.util';

export type { Requester };

@Injectable({
    providedIn: 'root'
})
export class VehicleService {
    private http = inject(HttpClient);

    constructor() { }

    // สุ่มสถานะคำขอ
    public getRandomStatus(type: 'allowance' | 'taxi' | 'vehicle'): string {
        return MockHelper.getRandomStatus(type);
    }

    // สุ่มวันที่ย้อนหลัง 3 เดือน
    public getRandomDateInPast3Months(): string {
        return MockHelper.getRandomDateInPast3Months();
    }

    // สุ่มข้อมูลผู้ส่งคำขอ
    public getRandomRequester(): Requester {
        return MockHelper.getRandomRequester();
    }

    // สร้างรายการวันที่ในเดือนและปีที่ระบุ
    public generateDays(monthInput: number | string, yearInput: number | string): Date[] {
        return MockHelper.generateDays(monthInput, yearInput);
    }

    // จัดรูปแบบวันที่เป็น dd/mm/yyyy
    public formatDate(d: Date): string {
        return MockHelper.formatDate(d);
    }

    // สุ่มรหัสกะการทำงาน
    public getRandomShiftCode(): string {
        return MockHelper.getRandomShiftCode();
    }

    // ดึงคลาส CSS สำหรับป้ายสถานะ (Badge)
    public getStatusBadgeClass(status: string): string {
        return StatusUtil.getStatusBadgeClass(status);
    }
}

