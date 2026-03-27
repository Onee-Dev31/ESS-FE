/** Service สำหรับจัดการข้อมูลคำขอเบี้ยเลี้ยงค่าแท็กซี่ (Taxi) */
import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { TaxiItem, TaxiRequest, TaxiLogItem } from '../interfaces/taxi.interface';
import { TaxiMock } from '../mocks/taxi.mock';
import { STORAGE_KEYS } from '../constants/storage.constants';
import { BaseRequestService } from './base-request.service';
import { environment } from '../../environments/environment';

export type { TaxiItem, TaxiRequest, TaxiLogItem };

@Injectable({
    providedIn: 'root'
})
export class TaxiService extends BaseRequestService<TaxiRequest> {
    protected override readonly STORAGE_KEY = STORAGE_KEYS.MOCK_TAXI_DATA;

    private baseUrl = environment.api_url;

    constructor(private _http: HttpClient) {
        super();
        this.initializeData(() => TaxiMock.generateRequestsByRole(20, 'Admin'));
    }

    getTaxiClaims(params: {
        page?: number;
        pageSize?: number;
        empCode?: string;
        searchText?: string;
        claimStatus?: string;
        dateFrom?: string;
        dateTo?: string;
    }): Observable<any> {
        const queryParams: any = {};
        if (params.page) queryParams.page_number = params.page;
        if (params.pageSize) queryParams.page_size = params.pageSize;
        if (params.empCode) queryParams.employee_code = params.empCode;
        if (params.searchText) queryParams.search = params.searchText;
        if (params.claimStatus) queryParams.status = params.claimStatus;
        if (params.dateFrom) queryParams.date_from = params.dateFrom;
        if (params.dateTo) queryParams.date_to = params.dateTo;
        return this._http.get(`${this.baseUrl}/taxi-claim/claims`, { params: queryParams });
    }

    getTaxiRequests(): Observable<TaxiRequest[]> {
        return this.getRequests();
    }

    getTaxiRequestById(id: string): Observable<TaxiRequest | undefined> {
        return this.getRequestById(id);
    }

    addTaxiRequest(request: TaxiRequest): Observable<void> {
        return this.addRequest(request);
    }

    updateTaxiRequest(id: string, updatedRequest: TaxiRequest): Observable<void> {
        return this.updateRequest(updatedRequest);
    }

    deleteTaxiRequest(id: string): Observable<void> {
        return this.deleteRequest(id);
    }

    generateNextTaxiId(): Observable<string> {
        return this.generateNextId();
    }

    updateTaxiStatus(id: string, status: string): void {
        this.updateStatus(id, status);
    }

    getMockTaxiLogs(month: number, year: number): Observable<TaxiLogItem[]> {
        const results = TaxiMock.getMockTaxiLogs(month, year);
        return of(results).pipe(delay(100));
    }
}
