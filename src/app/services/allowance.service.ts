/**
 * @file Allowance Service
 * @description Logic for Allowance Service
 */

// Section: Imports
import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { AllowanceItem, AllowanceRequest } from '../interfaces/allowance.interface';
import { AllowanceMock } from '../mocks/allowance.mock';
import { STORAGE_KEYS } from '../constants/storage.constants';
import { BaseRequestService } from './base-request.service';

export type { AllowanceItem, AllowanceRequest };

// Section: Logic
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

    calculateAllowance(log: any): any {
        if (!log.selected || !log.timeIn || !log.timeOut) {
            return {
                ...log,
                displayHours: '0.00',
                actualExtraHours: 0,
                amount: 0
            };
        }

        const [startHour, startMinute] = log.timeIn.split(':').map(Number);
        const [endHour, endMinute] = log.timeOut.split(':').map(Number);

        let totalMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
        if (totalMinutes < 0) totalMinutes += 1440;

        let extraMinutes = totalMinutes - 540;
        if (extraMinutes < 0) extraMinutes = 0;

        const extraHoursDecimal = extraMinutes / 60;
        const actualExtraHours = extraHoursDecimal;

        const hours = Math.floor(extraMinutes / 60);
        const minutes = extraMinutes % 60;
        const displayHours = `${hours}.${minutes.toString().padStart(2, '0')}`;

        let amount = 0;
        if (extraHoursDecimal >= 2) {
            if (extraHoursDecimal <= 4) amount = 150;
            else if (extraHoursDecimal <= 8) amount = 225;
            else if (extraHoursDecimal <= 12) amount = 300;
            else if (extraHoursDecimal <= 16) amount = 375;
            else if (extraHoursDecimal <= 20) amount = 450;
            else amount = 525;
        }

        return {
            ...log,
            actualExtraHours,
            displayHours,
            amount
        };
    }
}
