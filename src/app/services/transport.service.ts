import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject, delay } from 'rxjs';
import { LoadingService } from './loading.service';
import { RequestItem, VehicleRequest } from '../interfaces/transport.interface';
import { TransportMock } from '../mocks/transport.mock';
import { STORAGE_KEYS } from '../constants/storage.constants';
import { BUSINESS_CONFIG } from '../constants/business.constant';

export type { RequestItem, VehicleRequest };

@Injectable({
    providedIn: 'root'
})
export class TransportService {
    private loadingService = inject(LoadingService);
    private readonly STORAGE_KEY = STORAGE_KEYS.MOCK_TRANSPORT_DATA;
    private requestsSubject = new BehaviorSubject<VehicleRequest[]>([]);

    constructor() {
        this.initializeData();
    }

    private initializeData() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            this.updateSubject(data);
        } else {
            const masterData = TransportMock.generateRequestsByRole(20, 'Admin');
            this.saveToStorage(masterData);
            this.updateSubject(masterData);
        }
    }

    private saveToStorage(data: VehicleRequest[]) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }

    private updateSubject(masterData: VehicleRequest[]) {
        const role = localStorage.getItem(STORAGE_KEYS.USER_ROLE) || 'Member';
        const employeeId = localStorage.getItem(STORAGE_KEYS.EMPLOYEE_ID);

        let viewData = masterData;
        if (role !== 'Admin' && employeeId) {
            viewData = masterData.filter(req => req.requester?.employeeId === employeeId);
        }

        viewData.sort((a, b) => b.id.localeCompare(a.id));
        this.requestsSubject.next(viewData);
    }

    private getMasterData(): VehicleRequest[] {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    getRequests(): Observable<VehicleRequest[]> {
        const masterData = this.getMasterData();
        this.updateSubject(masterData);
        return this.loadingService.wrap(this.requestsSubject.asObservable().pipe(delay(100)));
    }

    getRequestById(id: string): Observable<VehicleRequest | undefined> {
        const masterData = this.getMasterData();
        const item = masterData.find(r => r.id === id);
        return this.loadingService.wrap(of(item).pipe(delay(100)));
    }

    addRequest(request: VehicleRequest): Observable<void> {
        const masterData = this.getMasterData();
        masterData.unshift(request);
        this.saveToStorage(masterData);
        this.updateSubject(masterData);
        return this.loadingService.wrap(of(void 0).pipe(delay(200)));
    }

    updateRequest(id: string, updatedRequest: VehicleRequest): Observable<void> {
        const masterData = this.getMasterData();
        const index = masterData.findIndex(r => r.id === id);
        if (index !== -1) {
            masterData[index] = updatedRequest;
            this.saveToStorage(masterData);
            this.updateSubject(masterData);
        }
        return this.loadingService.wrap(of(void 0).pipe(delay(200)));
    }

    deleteRequest(id: string): Observable<void> {
        let masterData = this.getMasterData();
        masterData = masterData.filter(r => r.id !== id);
        this.saveToStorage(masterData);
        this.updateSubject(masterData);
        return this.loadingService.wrap(of(void 0).pipe(delay(200)));
    }

    generateNextId(): Observable<string> {
        const masterData = this.getMasterData();
        const lastIdNum = masterData.reduce((max, item) => {
            const num = parseInt(item.id.split('#')[1] || '0');
            return num > max ? num : max;
        }, 0);
        const nextNum = (lastIdNum + 1).toString().padStart(3, '0');
        const prefix = BUSINESS_CONFIG.DEFAULT_PREFIX;
        return of(`${prefix}#${nextNum}`);
    }

    updateStatus(id: string, status: string): void {
        const masterData = this.getMasterData();
        const index = masterData.findIndex(r => r.id === id);
        if (index !== -1) {
            masterData[index].status = status;
            this.saveToStorage(masterData);
            this.updateSubject(masterData);
        }
    }

    refreshMockData() {
        const masterData = this.getMasterData();
        if (masterData.length === 0) {
            this.initializeData();
        } else {
            this.updateSubject(masterData);
        }
    }

    getMockAttendanceLogs(month: number, year: number): Observable<any[]> {
        const results = TransportMock.getMockAttendanceLogs(month, year);
        return of(results).pipe(delay(100));
    }
}
