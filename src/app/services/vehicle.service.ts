import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Requester } from '../interfaces';
import { MockHelper } from '../mocks';
import { StatusUtil } from '../utils/status.util';

export type { Requester };

@Injectable({
    providedIn: 'root'
})
export class VehicleService {
    private http = inject(HttpClient);

    constructor() { }

    public getRandomStatus(type: 'allowance' | 'taxi' | 'vehicle'): string {
        return MockHelper.getRandomStatus(type);
    }

    public getRandomDateInPast3Months(): string {
        return MockHelper.getRandomDateInPast3Months();
    }

    public getRandomRequester(): Requester {
        return MockHelper.getRandomRequester();
    }

    public generateDays(monthInput: number | string, yearInput: number | string): Date[] {
        return MockHelper.generateDays(monthInput, yearInput);
    }

    public formatDate(d: Date): string {
        return MockHelper.formatDate(d);
    }

    public getRandomShiftCode(): string {
        return MockHelper.getRandomShiftCode();
    }

    public getStatusBadgeClass(status: string): string {
        return StatusUtil.getStatusBadgeClass(status);
    }
}

