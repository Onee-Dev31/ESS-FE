import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject, delay } from 'rxjs';
import { LoadingService } from './loading.service';
import { AllowanceItem, AllowanceRequest } from '../interfaces/allowance.interface';
import { AllowanceMock } from '../mocks/allowance.mock';

export type { AllowanceItem, AllowanceRequest };

@Injectable({
    providedIn: 'root'
})
export class AllowanceService {
    private loadingService = inject(LoadingService);
    private readonly STORAGE_KEY = 'MOCK_ALLOWANCE_DATA';
    private allowanceRequestsSubject = new BehaviorSubject<AllowanceRequest[]>([]);

    constructor() {
        this.initializeData();
    }

    private initializeData() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            // Load existing data
            const data = JSON.parse(stored);
            this.updateSubject(data);
        } else {
            // Generate master dataset (Admin view = mixed users)
            const masterData = AllowanceMock.generateRequestsByRole(20, 'Admin');
            this.saveToStorage(masterData);
            this.updateSubject(masterData);
        }
    }

    private saveToStorage(data: AllowanceRequest[]) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }

    private updateSubject(masterData: AllowanceRequest[]) {
        const role = localStorage.getItem('userRole') || 'Member';
        const employeeId = localStorage.getItem('employeeId');

        let viewData = masterData;
        if (role !== 'Admin' && employeeId) {
            viewData = masterData.filter(req => req.requester?.employeeId === employeeId);
        }

        viewData.sort((a, b) => b.id.localeCompare(a.id));
        this.allowanceRequestsSubject.next(viewData);
    }

    private getMasterData(): AllowanceRequest[] {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    // --- Public API ---

    getAllowanceRequests(): Observable<AllowanceRequest[]> {
        const masterData = this.getMasterData();
        this.updateSubject(masterData);
        return this.loadingService.wrap(this.allowanceRequestsSubject.asObservable().pipe(delay(100)));
    }

    getAllowanceRequestById(id: string): Observable<AllowanceRequest | undefined> {
        const masterData = this.getMasterData();
        const item = masterData.find(r => r.id === id);
        return this.loadingService.wrap(of(item).pipe(delay(100)));
    }

    addAllowanceRequest(request: AllowanceRequest): Observable<void> {
        const masterData = this.getMasterData();
        masterData.unshift(request);
        this.saveToStorage(masterData);
        this.updateSubject(masterData);
        return this.loadingService.wrap(of(void 0).pipe(delay(200)));
    }

    updateAllowanceRequest(id: string, updatedRequest: AllowanceRequest): Observable<void> {
        let masterData = this.getMasterData();
        const index = masterData.findIndex(r => r.id === id);
        if (index !== -1) {
            masterData[index] = updatedRequest;
            this.saveToStorage(masterData);
            this.updateSubject(masterData);
        }
        return this.loadingService.wrap(of(void 0).pipe(delay(200)));
    }

    deleteAllowanceRequest(id: string): Observable<void> {
        let masterData = this.getMasterData();
        masterData = masterData.filter(r => r.id !== id);
        this.saveToStorage(masterData);
        this.updateSubject(masterData);
        return this.loadingService.wrap(of(void 0).pipe(delay(200)));
    }

    generateNextAllowanceId(): Observable<string> {
        const masterData = this.getMasterData();
        const prefix = '2701';
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

    refreshMockData() {
        const masterData = this.getMasterData();

        if (masterData.length === 0) {
            this.initializeData();
        } else {
            this.updateSubject(masterData);
        }
    }

    getMockAllowanceLogs(month: number, year: number): Observable<any[]> {
        const results = AllowanceMock.getMockAllowanceLogs(month, year);
        return of(results).pipe(delay(100));
    }

    updateAllowanceStatus(id: string, status: string): void {
        const masterData = this.getMasterData();
        const index = masterData.findIndex(r => r.id === id);
        if (index !== -1) {
            masterData[index].status = status;
            this.saveToStorage(masterData);
            this.updateSubject(masterData);
        }
    }
}
