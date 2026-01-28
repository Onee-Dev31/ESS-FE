import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { UserMock } from '../mocks/user.mock';

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
        return of(UserMock.PROFILE).pipe(delay(300));
    }
}
