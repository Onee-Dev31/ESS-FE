/** Service สำหรับจัดการการเข้าสู่ระบบ (Authentication), การจัดการ Token และสิทธิ์ของผู้ใช้ (Roles) */
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay, tap, finalize } from 'rxjs/operators';
import { STORAGE_KEYS } from '../constants/storage.constants';
import { USER_ROLES } from '../constants/user-roles.constant';

import { AllowanceService } from './allowance.service';
import { MedicalexpensesService } from './medicalexpenses.service';
import { TaxiService } from './taxi.service';
import { TransportService } from './transport.service';
import { TimeOffService } from './time-off.service';
import { UserMock } from '../mocks/auth-user.mock';
import { LoadingService } from './loading';
import { ToastService } from './toast';
import { environment } from '../../environments/environment';
import { PhoneUtil } from '../utils/phone.util';

import { catchError } from 'rxjs/operators';
import { SKIP_AUTH } from '../interceptors/auth.interceptor';


@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private baseUrl = environment.api_url;

    private _http = inject(HttpClient);
    private loadingService = inject(LoadingService);
    private toastService = inject(ToastService);

    private allowanceService = inject(AllowanceService);
    private medicalService = inject(MedicalexpensesService);
    private taxiService = inject(TaxiService);
    private transportService = inject(TransportService);
    private timeOffService = inject(TimeOffService);

    private _currentUser = signal<string | null>(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
    private _userRole = signal<string | null>(localStorage.getItem(STORAGE_KEYS.USER_ROLE));
    private _isLoggedIn = signal<boolean>(localStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN) === 'true');
    private _userData = signal<any | null>(this.getStoredUser());
    private _allData = signal<any | null>(this.getAllData());

    currentUser = this._currentUser.asReadonly();
    userRole = this._userRole.asReadonly();
    isLoggedIn = this._isLoggedIn.asReadonly();
    userData = this._userData.asReadonly();
    allData = this._allData.asReadonly();

    readonly userPhone = computed(() => {
        const user = this._userData();
        return user?.USR_MOBILE
            ? PhoneUtil.formatPhoneNumber(user.USR_MOBILE)
            : '';
    });

    isAdmin = computed(() => {
        const role = this._userRole();
        return role === USER_ROLES.HR || role === USER_ROLES.EXECUTIVE || role === USER_ROLES.SUPERVISOR;
    });
    isHR = computed(() => this._userRole() === USER_ROLES.HR);
    isAccounting = computed(() => this._userRole() === USER_ROLES.ACCOUNTING);
    isSupervisor = computed(() => this._userRole() === USER_ROLES.SUPERVISOR);
    isExecutive = computed(() => this._userRole() === USER_ROLES.EXECUTIVE);

    private getStoredUser(): any | null {
        const data = localStorage.getItem(STORAGE_KEYS.USER_DATA);
        if (!data) return null;

        try {
            return JSON.parse(data);
        } catch {
            return null;
        }
    }

    private getAllData(): any | null {
        const data = localStorage.getItem(STORAGE_KEYS.ALL_DATA);
        if (!data) return null;

        try {
            return JSON.parse(data);
        } catch {
            return null;
        }
    }

    login(username: string, password: string): Observable<any> {
        this.loadingService.show();
        return this._http.post<any>(`${this.baseUrl}/auth/login`, {
            username,
            password
        }, {
            context: new HttpContext().set(SKIP_AUTH, true)
        }).pipe(
            tap(response => {
                if (response) {
                    this.storeLoginResponse(response);
                }
            }),
            finalize(() => {
                this.loadingService.hide();
            })
        );
    }

    generateQr(): Observable<{ qrToken: string; qrImage: string; expiresAt: string }> {
        return this._http.get<any>(`${this.baseUrl}/auth/qr/generate`, {
            context: new HttpContext().set(SKIP_AUTH, true)
        });
    }

    getQrStatus(qrToken: string): Observable<{ status: string;[key: string]: any }> {
        return this._http.get<any>(`${this.baseUrl}/auth/qr/status/${qrToken}`, {
            context: new HttpContext().set(SKIP_AUTH, true)
        });
    }

    confirmQr(qrToken: string): Observable<any> {
        return this._http.post<any>(`${this.baseUrl}/auth/qr/confirm`, { qrToken });
    }

    storeLoginResponse(response: any) {
        localStorage.setItem(STORAGE_KEYS.ALL_DATA, JSON.stringify(response));
        localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, response.adUser || '');
        localStorage.setItem(STORAGE_KEYS.USER_ROLE, response.permission.Role || '');
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.employee) || '');

        this._isLoggedIn.set(true);
        this._currentUser.set(response.adUser);
        this._userRole.set(response.permission.Role);
        this._userData.set(response.employee);
    }

    /** ล้างข้อมูลการเข้าสู่ระบบ (Logout) และรีเซ็ตสถานะทั้งหมด */
    logout() {
        localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_IN);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
        localStorage.removeItem(STORAGE_KEYS.EMPLOYEE_ID);
        localStorage.removeItem(STORAGE_KEYS.ALL_DATA);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
        localStorage.removeItem('landingPath');
        localStorage.removeItem('systemCode');
        // localStorage.removeItem(STORAGE_KEYS.TICKET_DETAIL)

        this._isLoggedIn.set(false);
        this._currentUser.set(null);
        this._userRole.set(null);
        this._userData.set(null);
        // this._ticketDetail.set(null);

        this.refreshAllMockData();
    }

    /** อัปเดตข้อมูล Mock Data ใหม่ตามสิทธิ์ของผู้ใช้ปัจจุบัน */
    private refreshAllMockData() {
        this.allowanceService.refreshMockData();
        this.medicalService.refreshMockData();
        this.taxiService.refreshMockData();
        this.transportService.refreshMockData();
        this.timeOffService.refreshMockData();
    }

    getUserRole(): string | null {
        return this._userRole();
    }

    getToken(): string | null {
        return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    }

    getEmployeeId(): string | null {
        return localStorage.getItem(STORAGE_KEYS.EMPLOYEE_ID);
    }

    getAllowedPaths(): string[] {
        const data = localStorage.getItem(STORAGE_KEYS.ALL_DATA);
        if (!data) return [];

        const parsed = JSON.parse(data);
        const menus = parsed?.menus || [];

        return menus
            .filter((m: any) => m.RoutePath && m.RoutePath !== '/')
            .map((m: any) => m.RoutePath.replace(/^\/+/, ''));
    }

    getMagicUser() {
        return this._http.get<any>(`${this.baseUrl}/auth/me`, {
            withCredentials: true
        });
    }

    initializeFromBackend() {
        return this.getMagicUser().pipe(
            tap(res => {
                if (!res?.success) return;
                console.log("res : ", JSON.stringify(res));

                localStorage.setItem(STORAGE_KEYS.ALL_DATA, JSON.stringify(res));
                localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
                localStorage.setItem(STORAGE_KEYS.CURRENT_USER, res.adUser || '');
                localStorage.setItem(STORAGE_KEYS.USER_ROLE, res.permission?.Role || '');
                localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(res.employee) || '');

                this._isLoggedIn.set(true);
                this._currentUser.set(res.adUser);
                this._userRole.set(res.permission?.Role);
                this._userData.set(res.employee);
            }),
            catchError(() => {
                // ถ้า 401 ไม่ต้องทำอะไรเลย
                return of(null);
            })
        );
    }

    loginSSO(accessToken: string, systemCode: string): Observable<any> {
        this.loadingService.show();
        return this._http.post<any>(`${this.baseUrl}/auth/login/sso`, {
            accessToken,
            systemCode
        }, {
            context: new HttpContext().set(SKIP_AUTH, true)
        }).pipe(
            tap(response => {
                if (response) {
                    localStorage.setItem(STORAGE_KEYS.ALL_DATA, JSON.stringify(response));
                    localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
                    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, response.adUser || '');
                    localStorage.setItem(STORAGE_KEYS.USER_ROLE, response.permission.Role || '');
                    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.employee) || '');
                    localStorage.setItem("landingPath", response.landingPath);
                    localStorage.setItem("systemCode", response.systmeCode);
                    this._isLoggedIn.set(true);
                    this._currentUser.set(response.adUser);
                    this._userRole.set(response.permission.Role);
                    this._userData.set(response.employee);
                }
            }),
            finalize(() => {
                this.loadingService.hide();
            })
        );
    }
}
