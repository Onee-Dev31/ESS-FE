import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

// ประเภทของสวัสดิการ
export const WELFARE_TYPES = {
    ALLOWANCE: 1,
    TRANSPORT: 2,
    TAXI: 3
};

// ข้อมูลผู้ส่งคำขอ
export interface Requester {
    name: string;
    employeeId: string;
    department: string;
    company: string;
}

@Injectable({
    providedIn: 'root'
})
export class VehicleService {
    private http = inject(HttpClient);

    constructor() { }

    // สุ่มสถานะคำขอ
    public getRandomStatus(type: 'allowance' | 'taxi' | 'vehicle'): string {
        const statuses = [
            'คำขอใหม่',
            'ตรวจสอบแล้ว',
            'อยู่ระหว่างการอนุมัติ',
            'อนุมัติแล้ว'
        ];
        return statuses[Math.floor(Math.random() * statuses.length)];
    }

    // สุ่มวันที่ย้อนหลัง 3 เดือน
    public getRandomDateInPast3Months(): string {
        const today = new Date();
        const pastDate = new Date();
        pastDate.setMonth(today.getMonth() - 3);
        const randomTime = pastDate.getTime() + Math.random() * (today.getTime() - pastDate.getTime());
        const date = new Date(randomTime);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // สุ่มข้อมูลผู้ส่งคำขอ
    public getRandomRequester(): Requester {
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

    // สร้างรายการวันที่ในเดือนและปีที่ระบุ
    public generateDays(month: number, year: number): Date[] {
        const adYear = year - 543;
        const date = new Date(adYear, month, 1);
        const days: Date[] = [];
        while (date.getMonth() === month) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    }

    // จัดรูปแบบวันที่เป็น dd/mm/yyyy
    public formatDate(d: Date): string {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }

    // สุ่มรหัสกะการทำงาน
    public getRandomShiftCode(): string {
        const shifts = [
            'O01 09.00-18.00', 'O02 10.00-19.00', 'O03 10.00-22.00', 'O04 09.00-23.00', 'O19 19.00-07.00',
            'O01 09.00-18.01', 'O02 10.00-19.01', 'O03 10.00-22.01', 'O04 09.00-23.01', 'O19 19.00-07.02'
        ];
        return shifts[Math.floor(Math.random() * shifts.length)];
    }

    // ดึงคลาส CSS สำหรับป้ายสถานะ (Badge)
    public getStatusBadgeClass(status: string): string {
        const s = status?.trim();
        switch (s) {
            case 'คำขอใหม่': return 'status-new';
            case 'ตรวจสอบแล้ว':
            case 'รอตรวจสอบ': return 'status-verified';
            case 'อยู่ระหว่างการอนุมัติ': return 'status-pending';
            case 'อนุมัติแล้ว': return 'status-success';
            case 'ไม่อนุมัติ': return 'status-rejected';
            case 'รอแก้ไข': return 'status-referred-back';
            default: return '';
        }
    }
}

