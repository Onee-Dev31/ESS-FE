/** Service สำหรับจัดการข้อมูลคำขอเบี้ยเลี้ยงค่ารถ (Transport) */
import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { RequestItem, VehicleRequest, AttendanceLog } from '../interfaces/transport.interface';
import { TransportMock } from '../mocks/transport.mock';
import { STORAGE_KEYS } from '../constants/storage.constants';
import { BaseRequestService } from './base-request.service';

export type { RequestItem, VehicleRequest, AttendanceLog };

@Injectable({
    providedIn: 'root'
})
export class TransportService extends BaseRequestService<VehicleRequest> {
    protected override readonly STORAGE_KEY = STORAGE_KEYS.MOCK_TRANSPORT_DATA;

    constructor() {
        super();
        this.initializeData(() => TransportMock.generateRequestsByRole(20, 'Admin'));
    }

    getMockAttendanceLogs(month: number, year: number): Observable<AttendanceLog[]> {
        const results = TransportMock.getMockAttendanceLogs(month, year);
        return of(results).pipe(delay(100));
    }

    getVehicleRequests(): Observable<VehicleRequest[]> {
        return this.getRequests();
    }

    getVehicleRequestById(id: string): Observable<VehicleRequest | undefined> {
        return this.getRequestById(id);
    }

    addVehicleRequest(request: VehicleRequest): Observable<void> {
        return this.addRequest(request);
    }

    updateVehicleRequest(id: string, updatedRequest: VehicleRequest): Observable<void> {
        return this.updateRequest(updatedRequest);
    }
}
