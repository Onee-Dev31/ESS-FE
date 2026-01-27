import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

// ข้อมูลโปรไฟล์ผู้ใช้งาน
export interface UserProfile {
    name: string;
    email: string;
    employeeId: string;
    department: string;
    company: string;
    position: string;
    phone: string;
    floor: string;
    itAssets?: {
        account: string;
        expireDate: string;
        laptop: string;
        pc: string;
        monitor: string;
    };
}

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private http = inject(HttpClient);

    constructor() { }

    // ดึงข้อมูลโปรไฟล์ผู้ใช้งานจำลอง
    getUserProfile(): Observable<UserProfile> {
        const MOCK_PROFILE: UserProfile = {
            name: 'Rapeepan Pipatvejwong (Jola)',
            email: 'praewnapa.boo@onee.one',
            employeeId: 'OTD01054',
            department: '11206 - Program Development',
            company: 'OTV-บริษัท วัน สามสิบเอ็ด จำกัด',
            position: 'Senior Developer',
            phone: '9409',
            floor: '15',
            itAssets: {
                account: 'praewnapaboo',
                expireDate: '16-Jul-2026',
                laptop: 'Dell 555 Asset No. 44545sf45dfd86',
                pc: 'Dell 888 Asset No. 415v489dfg7df/9',
                monitor: 'Dell 999 Asset No. 415v489dfg7df/9'
            }
        };

        return of(MOCK_PROFILE).pipe(delay(300));
    }
}

