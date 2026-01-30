import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject, delay } from 'rxjs';
import { LoadingService } from './loading.service';
import { TaxiItem, TaxiRequest } from '../interfaces/taxi.interface';
import { TaxiMock } from '../mocks/taxi.mock';

export type { TaxiItem, TaxiRequest };

@Injectable({
    providedIn: 'root'
})
export class TaxiService {
    private loadingService = inject(LoadingService);
    private readonly STORAGE_KEY = 'MOCK_TAXI_DATA';
    private taxiRequestsSubject = new BehaviorSubject<TaxiRequest[]>([]);

    constructor() {
        this.initializeData();
    }

    private initializeData() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            this.updateSubject(data);
        } else {
            const masterData = TaxiMock.generateRequestsByRole(20, 'Admin');
            this.saveToStorage(masterData);
            this.updateSubject(masterData);
        }
    }

    private saveToStorage(data: TaxiRequest[]) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }

    private updateSubject(masterData: TaxiRequest[]) {
        const role = localStorage.getItem('userRole') || 'Member';
        const employeeId = localStorage.getItem('employeeId');

        let viewData = masterData;
        if (role !== 'Admin' && employeeId) {
            viewData = masterData.filter(req => req.requester?.employeeId === employeeId);
        }

        viewData.sort((a, b) => b.id.localeCompare(a.id));
        this.taxiRequestsSubject.next(viewData);
    }

    private getMasterData(): TaxiRequest[] {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    getTaxiRequests(): Observable<TaxiRequest[]> {
        const masterData = this.getMasterData();
        this.updateSubject(masterData);
        return this.loadingService.wrap(this.taxiRequestsSubject.asObservable().pipe(delay(100)));
    }

    getTaxiRequestById(id: string): Observable<TaxiRequest | undefined> {
        const masterData = this.getMasterData();
        const item = masterData.find(r => r.id === id);
        return this.loadingService.wrap(of(item).pipe(delay(100)));
    }

    addTaxiRequest(request: TaxiRequest): Observable<void> {
        const masterData = this.getMasterData();
        masterData.unshift(request);
        this.saveToStorage(masterData);
        this.updateSubject(masterData);
        return this.loadingService.wrap(of(void 0).pipe(delay(200)));
    }

    updateTaxiRequest(id: string, updatedRequest: TaxiRequest): Observable<void> {
        const masterData = this.getMasterData();
        const index = masterData.findIndex(r => r.id === id);
        if (index !== -1) {
            masterData[index] = updatedRequest;
            this.saveToStorage(masterData);
            this.updateSubject(masterData);
        }
        return this.loadingService.wrap(of(void 0).pipe(delay(200)));
    }

    deleteTaxiRequest(id: string): Observable<void> {
        let masterData = this.getMasterData();
        masterData = masterData.filter(r => r.id !== id);
        this.saveToStorage(masterData);
        this.updateSubject(masterData);
        return this.loadingService.wrap(of(void 0).pipe(delay(200)));
    }

    generateNextTaxiId(): Observable<string> {
        const masterData = this.getMasterData();
        const lastIdNum = masterData.reduce((max, item) => {
            const num = parseInt(item.id.split('#')[1] || '0');
            return num > max ? num : max;
        }, 0);
        const nextNum = (lastIdNum + 1).toString().padStart(3, '0');
        return of(`2701#${nextNum}`);
    }

    updateTaxiStatus(id: string, status: string): void {
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

    getMockTaxiLogs(month: number, year: number): Observable<any[]> {
        const results = TaxiMock.getMockTaxiLogs(month, year);
        return of(results).pipe(delay(100));
    }
}
