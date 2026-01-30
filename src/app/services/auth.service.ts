import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay, tap } from 'rxjs/operators';
import { STORAGE_KEYS } from '../constants/storage.constants';
import { USER_ROLES } from '../constants/user-roles.constant';

import { AllowanceService } from './allowance.service';
import { MedicalexpensesService } from './medicalexpenses.service';
import { TaxiService } from './taxi.service';
import { TransportService } from './transport.service';
import { TimeOffService } from './time-off.service';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private http = inject(HttpClient);
    private allowanceService = inject(AllowanceService);
    private medicalService = inject(MedicalexpensesService);
    private taxiService = inject(TaxiService);
    private transportService = inject(TransportService);
    private timeOffService = inject(TimeOffService);

    private readonly MOCK_USERS = [
        { username: 'admin', password: '123', name: 'Admin User', role: USER_ROLES.ADMIN, employeeId: 'OTD00001' },
        { username: 'member', password: '123', name: 'Member User', role: USER_ROLES.MEMBER, employeeId: 'OTD01054' }
    ];

    // Reactive State using Signals
    private _currentUser = signal<string | null>(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
    private _userRole = signal<string | null>(localStorage.getItem(STORAGE_KEYS.USER_ROLE));
    private _isLoggedIn = signal<boolean>(localStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN) === 'true');

    currentUser = this._currentUser.asReadonly();
    userRole = this._userRole.asReadonly();
    isLoggedIn = this._isLoggedIn.asReadonly();

    isAdmin = computed(() => this._userRole() === USER_ROLES.ADMIN);

    constructor() { }

    // ตรวจสอบการเข้าสู่ระบบ
    login(email: string, password: string): Observable<boolean> {
        const user = this.MOCK_USERS.find(u => u.username === email && u.password === password);

        return of(!!user).pipe(
            delay(200),
            tap(isValid => {
                if (isValid && user) {
                    localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
                    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, user.name);
                    localStorage.setItem(STORAGE_KEYS.USER_ROLE, user.role);
                    localStorage.setItem(STORAGE_KEYS.EMPLOYEE_ID, user.employeeId);

                    this._isLoggedIn.set(true);
                    this._currentUser.set(user.name);
                    this._userRole.set(user.role);

                    // Refresh Mock Data
                    this.refreshAllMockData();
                }
            })
        );
    }

    // ออกจากระบบ
    logout() {
        localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_IN);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
        localStorage.removeItem(STORAGE_KEYS.EMPLOYEE_ID);

        this._isLoggedIn.set(false);
        this._currentUser.set(null);
        this._userRole.set(null);

        // Refresh Mock Data (will default to Member/Empty)
        this.refreshAllMockData();
    }

    private refreshAllMockData() {
        this.allowanceService.refreshMockData();
        this.medicalService.refreshMockData();
        this.taxiService.refreshMockData();
        this.transportService.refreshMockData();
        this.timeOffService.refreshMockData();
    }

    // ดึง Role ของผู้ใช้ปัจจุบัน
    getUserRole(): string | null {
        return this._userRole();
    }

    // ดึง Token จาก LocalStorage (สำหรับ Interceptor)
    getToken(): string | null {
        return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    }

    // ดึง Employee ID ของผู้ใช้ปัจจุบัน
    getEmployeeId(): string | null {
        return localStorage.getItem(STORAGE_KEYS.EMPLOYEE_ID);
    }
}

