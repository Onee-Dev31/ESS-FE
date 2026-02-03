import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject, delay } from 'rxjs';
import { LoadingService } from './loading.service';
import { MedicalItem, MedicalRequest } from '../interfaces/medical.interface';
import { MedicalMock } from '../mocks/medical.mock';

import { STORAGE_KEYS } from '../constants/storage.constants';
import { BUSINESS_CONFIG } from '../constants/business.constant';

export type { MedicalItem, MedicalRequest };

@Injectable({
    providedIn: 'root'
})
export class MedicalexpensesService {
    private loadingService = inject(LoadingService);
    private readonly STORAGE_KEY = STORAGE_KEYS.MOCK_MEDICAL_DATA;
    private medicalRequestsSubject = new BehaviorSubject<MedicalRequest[]>([]);

    constructor() {
        this.initializeData();
    }

    private initializeData() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            this.updateSubject(data);
        } else {
            const masterData = MedicalMock.generateRequestsByRole(20, 'Admin');
            this.saveToStorage(masterData);
            this.updateSubject(masterData);
        }
    }

    private saveToStorage(data: MedicalRequest[]) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }

    private updateSubject(masterData: MedicalRequest[]) {
        const role = localStorage.getItem(STORAGE_KEYS.USER_ROLE) || 'Member';
        const employeeId = localStorage.getItem(STORAGE_KEYS.EMPLOYEE_ID);

        let viewData = masterData;
        if (role !== 'Admin' && employeeId) {
            viewData = masterData.filter(req => req.requester?.employeeId === employeeId);
        }

        viewData.sort((a, b) => b.id.localeCompare(a.id));
        this.medicalRequestsSubject.next(viewData);
    }

    private getMasterData(): MedicalRequest[] {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    }


    getRequests(): Observable<MedicalRequest[]> {
        const masterData = this.getMasterData();
        this.updateSubject(masterData);
        return this.loadingService.wrap(this.medicalRequestsSubject.asObservable().pipe(delay(100)));
    }

    getRequestById(id: string): Observable<MedicalRequest | undefined> {
        const masterData = this.getMasterData();
        const item = masterData.find(r => r.id === id);
        return this.loadingService.wrap(of(item).pipe(delay(100)));
    }

    addRequest(request: MedicalRequest): Observable<void> {
        const masterData = this.getMasterData();
        masterData.unshift(request);
        this.saveToStorage(masterData);
        this.updateSubject(masterData);
        return this.loadingService.wrap(of(void 0).pipe(delay(200)));
    }

    updateRequest(updatedRequest: MedicalRequest): Observable<void> {
        const id = updatedRequest.id;
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
        const prefix = BUSINESS_CONFIG.DEFAULT_PREFIX;
        const lastIdNum = masterData.reduce((max, item) => {
            if (item.id.startsWith(prefix)) {
                const parts = item.id.split('#');
                const num = parseInt(parts[1] || '0');
                return num > max ? num : max;
            }
            return max;
        }, 0);
        return of(`${prefix}#${(lastIdNum + 1).toString().padStart(3, '0')}`);
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
}
