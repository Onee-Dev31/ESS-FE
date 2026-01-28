import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay, tap } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private http = inject(HttpClient);

    private readonly MOCK_USER = {
        username: 'admin',
        password: '123'
    };

    constructor() { }

    // ตรวจสอบการเข้าสู่ระบบ
    login(email: string, password: string): Observable<boolean> {
        const success = email === this.MOCK_USER.username && password === this.MOCK_USER.password;

        return of(success).pipe(
            delay(1000),
            tap(isValid => {
                if (isValid) {
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('currentUser', 'Admin User');
                }
            })
        );
    }

    // ออกจากระบบ
    logout() {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('currentUser');
    }

    // ดึง Token จาก LocalStorage (สำหรับ Interceptor)
    getToken(): string | null {
        return localStorage.getItem('authToken'); // ปรับตามระบบจริงเมื่อต่อ API
    }
}

