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
import { LoadingService } from './loading';
import { StorageService } from './storage.service';
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
    private storageService = inject(StorageService);

    private allowanceService = inject(AllowanceService);
    private medicalService = inject(MedicalexpensesService);
    private taxiService = inject(TaxiService);
    private transportService = inject(TransportService);
    private timeOffService = inject(TimeOffService);

    private _currentUser = signal<string | null>(this.storageService.getCurrentUser());
    private _userRole = signal<string | null>(this.storageService.getUserRole());
    private _isLoggedIn = signal<boolean>(this.storageService.isLoggedIn());
    private _userData = signal<any | null>(this.storageService.getUserData());
    private _allData = signal<any | null>(this.storageService.getAllData());

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
                    this.storageService.setAllData(response);
                    this.storageService.setLoggedIn(true);
                    this.storageService.setCurrentUser(response.adUser || '');
                    this.storageService.setUserRole(response.permission.Role || '');
                    this.storageService.setUserData(response.employee);

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

    /** ล้างข้อมูลการเข้าสู่ระบบ (Logout) และรีเซ็ตสถานะทั้งหมด */
    logout() {
        this.storageService.clearSession();
        this.storageService.remove('landingPath');
        this.storageService.remove('systemCode');

        this._isLoggedIn.set(false);
        this._currentUser.set(null);
        this._userRole.set(null);
        this._userData.set(null);

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
        return this.storageService.get<string>(STORAGE_KEYS.AUTH_TOKEN);
    }

    getEmployeeId(): string | null {
        return this.storageService.getEmployeeId();
    }

    getAllowedPaths(): string[] {
        const parsed = this.storageService.getAllData<{ menus?: Array<{ RoutePath?: string }> }>();
        if (!parsed) return [];

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

                this.storageService.setAllData(res);
                this.storageService.setLoggedIn(true);
                this.storageService.setCurrentUser(res.adUser || '');
                this.storageService.setUserRole(res.permission?.Role || '');
                this.storageService.setUserData(res.employee);

                this._isLoggedIn.set(true);
                this._currentUser.set(res.adUser);
                this._userRole.set(res.permission?.Role);
                this._userData.set(res.employee);
            }),
            catchError(() => of(null))
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
                    this.storageService.setAllData(response);
                    this.storageService.setLoggedIn(true);
                    this.storageService.setCurrentUser(response.adUser || '');
                    this.storageService.setUserRole(response.permission.Role || '');
                    this.storageService.setUserData(response.employee);
                    this.storageService.set('landingPath', response.landingPath);
                    this.storageService.set('systemCode', response.systmeCode);

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
