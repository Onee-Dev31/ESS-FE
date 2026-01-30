import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject, delay } from 'rxjs';
import { LoadingService } from './loading.service';
import { TimeOffRequest } from '../interfaces/time-off.interface';
import { TimeOffMock } from '../mocks/time-off.mock';

export type { TimeOffRequest };

@Injectable({
    providedIn: 'root'
})
export class TimeOffService {
    private http = inject(HttpClient);
    private loadingService = inject(LoadingService);
    private readonly STORAGE_KEY = 'MOCK_TIMEOFF_DATA';
    private requestsSubject = new BehaviorSubject<TimeOffRequest[]>([]);

    constructor() {
        this.initializeData();
    }

    private initializeData() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            this.updateSubject(data);
        } else {
            const masterData = TimeOffMock.generateRequestsByRole(20, 'Admin');
            this.saveToStorage(masterData);
            this.updateSubject(masterData);
        }
    }

    private saveToStorage(data: TimeOffRequest[]) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }

    private updateSubject(masterData: TimeOffRequest[]) {
        const role = localStorage.getItem('userRole') || 'Member';
        const employeeId = localStorage.getItem('employeeId');

        let viewData = masterData;
        if (role !== 'Admin' && employeeId) {
            viewData = masterData.filter(req => req.requester?.employeeId === employeeId);
        }

        viewData.sort((a, b) => b.id.localeCompare(a.id));
        this.requestsSubject.next(viewData);
    }

    private getMasterData(): TimeOffRequest[] {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    getRequests(): Observable<TimeOffRequest[]> {
        const masterData = this.getMasterData();
        this.updateSubject(masterData);
        return this.loadingService.wrap(this.requestsSubject.asObservable().pipe(delay(200)));
    }

    getRequestById(id: string): Observable<TimeOffRequest | undefined> {
        const masterData = this.getMasterData();
        const item = masterData.find(r => r.id === id);
        return this.loadingService.wrap(of(item).pipe(delay(200)));
    }

    addRequest(request: TimeOffRequest): Observable<void> {
        const masterData = this.getMasterData();
        masterData.unshift(request);
        this.saveToStorage(masterData);
        this.updateSubject(masterData);
        return this.loadingService.wrap(of(void 0).pipe(delay(400)));
    }

    updateRequest(id: string, updatedRequest: TimeOffRequest): Observable<void> {
        const masterData = this.getMasterData();
        const index = masterData.findIndex(r => r.id === id);
        if (index !== -1) {
            masterData[index] = updatedRequest;
            this.saveToStorage(masterData);
            this.updateSubject(masterData);
        }
        return this.loadingService.wrap(of(void 0).pipe(delay(400)));
    }

    deleteRequest(id: string): Observable<void> {
        let masterData = this.getMasterData();
        masterData = masterData.filter(r => r.id !== id);
        this.saveToStorage(masterData);
        this.updateSubject(masterData);
        return this.loadingService.wrap(of(void 0).pipe(delay(400)));
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
