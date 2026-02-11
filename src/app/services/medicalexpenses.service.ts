/** Service สำหรับจัดการข้อมูลคำขอเบี้ยเลี้ยงค่ารักษาพยาบาล (Medical Expenses) */
import { Injectable } from '@angular/core';
import { MedicalItem, MedicalRequest } from '../interfaces/medical.interface';
export type { MedicalItem, MedicalRequest };
import { MedicalMock } from '../mocks/medical.mock';
import { STORAGE_KEYS } from '../constants/storage.constants';
import { BaseRequestService } from './base-request.service';

@Injectable({
    providedIn: 'root'
})
export class MedicalexpensesService extends BaseRequestService<MedicalRequest> {
    protected override readonly STORAGE_KEY = STORAGE_KEYS.MOCK_MEDICAL_DATA;

    constructor() {
        super();
        this.initializeData(() => MedicalMock.generateRequestsByRole(20, 'Admin'));
    }

}
