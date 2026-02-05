/**
 * @file Auth Service
 * @description Logic for Auth Service
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

// Section: Logic
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
    private loadingService = inject(LoadingService);
    private toastService = inject(ToastService);

    private readonly MOCK_USERS = UserMock.MOCK_USERS;

    private _currentUser = signal<string | null>(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
    private _userRole = signal<string | null>(localStorage.getItem(STORAGE_KEYS.USER_ROLE));
    private _isLoggedIn = signal<boolean>(localStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN) === 'true');

    currentUser = this._currentUser.asReadonly();
    userRole = this._userRole.asReadonly();
    isLoggedIn = this._isLoggedIn.asReadonly();

    isAdmin = computed(() => this._userRole() === USER_ROLES.ADMIN);

    constructor() { }

    login(email: string, password: string, rememberMe: boolean = false): Observable<boolean> {
        this.loadingService.show();
        const user = this.MOCK_USERS.find(u => u.username === email && u.password === password);

        return of(!!user).pipe(
            delay(1000), // Simulate network delay for premium feel
            tap(isValid => {
                if (isValid && user) {
                    localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
                    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, user.name || '');
                    localStorage.setItem(STORAGE_KEYS.USER_ROLE, user.role || '');
                    localStorage.setItem(STORAGE_KEYS.EMPLOYEE_ID, user.employeeId || '');

                    if (rememberMe) {
                        localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
                        localStorage.setItem(STORAGE_KEYS.REMEMBERED_EMAIL, email);
                    } else {
                        localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
                        localStorage.removeItem(STORAGE_KEYS.REMEMBERED_EMAIL);
                    }

                    this._isLoggedIn.set(true);
                    this._currentUser.set(user.name);
                    this._userRole.set(user.role);

                    this.refreshAllMockData();
                    this.toastService.success(`Welcome back, ${user.name}!`);
                } else {
                    this.toastService.error('Invalid username or password.');
                }
            }),
            finalize(() => this.loadingService.hide())
        );
    }

    logout() {
        localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_IN);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
        localStorage.removeItem(STORAGE_KEYS.EMPLOYEE_ID);

        this._isLoggedIn.set(false);
        this._currentUser.set(null);
        this._userRole.set(null);

        this.refreshAllMockData();
    }

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
}

