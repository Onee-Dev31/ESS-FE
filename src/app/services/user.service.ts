/** Service สำหรับดึงข้อมูลโปรไฟล์และสิทธิ์ของพนักงาน */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { UserMock } from '../mocks/auth-user.mock';

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

import { STORAGE_KEYS } from '../constants/storage.constants';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private http = inject(HttpClient);

    getUserProfile(): Observable<UserProfile> {
        const role = localStorage.getItem(STORAGE_KEYS.USER_ROLE);
        const profile = role === 'Admin' ? UserMock.ADMIN_PROFILE : UserMock.MEMBER_PROFILE;
        return of(profile).pipe(delay(100));
    }
}
