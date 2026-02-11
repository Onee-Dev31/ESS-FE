/** Service สำหรับจัดการข้อมูลคำขอลา (Time Off) */
import { Injectable } from '@angular/core';
import { TimeOffRequest } from '../interfaces/time-off.interface';
import { TimeOffMock } from '../mocks/time-off.mock';
import { STORAGE_KEYS } from '../constants/storage.constants';
import { BaseRequestService } from './base-request.service';

export type { TimeOffRequest };

@Injectable({
    providedIn: 'root'
})
export class TimeOffService extends BaseRequestService<TimeOffRequest> {
    protected override readonly STORAGE_KEY = STORAGE_KEYS.MOCK_TIMEOFF_DATA;

    constructor() {
        super();
        this.initializeData(() => TimeOffMock.generateRequestsByRole(20, 'Admin'));
    }
}
