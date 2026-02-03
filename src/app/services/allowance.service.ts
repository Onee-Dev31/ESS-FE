import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { AllowanceItem, AllowanceRequest } from '../interfaces/allowance.interface';
import { AllowanceMock } from '../mocks/allowance.mock';
import { STORAGE_KEYS } from '../constants/storage.constants';
import { BaseRequestService } from './base-request.service';

export type { AllowanceItem, AllowanceRequest };

@Injectable({
    providedIn: 'root'
})
export class AllowanceService extends BaseRequestService<AllowanceRequest> {
    protected override readonly STORAGE_KEY = STORAGE_KEYS.MOCK_ALLOWANCE_DATA;

    constructor() {
        super();
        this.initializeData(() => AllowanceMock.generateRequestsByRole(20, 'Admin'));
    }

    getAllowanceRequests(): Observable<AllowanceRequest[]> {
        return this.getRequests();
    }

    getAllowanceRequestById(id: string): Observable<AllowanceRequest | undefined> {
        return this.getRequestById(id);
    }

    addAllowanceRequest(request: AllowanceRequest): Observable<void> {
        return this.addRequest(request);
    }

    updateAllowanceRequest(id: string, updatedRequest: AllowanceRequest): Observable<void> {
        return this.updateRequest(updatedRequest);
    }

    deleteAllowanceRequest(id: string): Observable<void> {
        return this.deleteRequest(id);
    }

    generateNextAllowanceId(): Observable<string> {
        return this.generateNextId();
    }

    updateAllowanceStatus(id: string, status: string): void {
        this.updateStatus(id, status);
    }

    getMockAllowanceLogs(month: number, year: number): Observable<any[]> {
        const results = AllowanceMock.getMockAllowanceLogs(month, year);
        return of(results).pipe(delay(100));
    }
}
