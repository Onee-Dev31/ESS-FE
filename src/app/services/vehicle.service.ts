import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class VehicleService {

    private baseUrl = environment.api_url;
    private ONEEJOB_url = environment.api_ONEEJOB_url;

    constructor(private _http: HttpClient,
        private authservice: AuthService
    ) { }

    getEmployee(params: {
        page?: number;
        pageSize?: number;
        searchText?: string;
        companyCode?: any;
        costCent?: any;
        empStatus?: string;
    }): Observable<any> {
        const queryParams: any = {};

        if (params.page) queryParams.page = params.page;
        if (params.pageSize) queryParams.perPage = params.pageSize;
        if (params.searchText) queryParams.searchText = params.searchText;
        if (params.companyCode) queryParams.companyCode = params.companyCode;
        if (params.costCent) queryParams.costCent = params.costCent;
        if (params.empStatus) queryParams.empStatus = params.empStatus;

        // console.log("params >>> ", queryParams)

        return this._http.get<any>(`${this.baseUrl}/employees`, {
            params: queryParams
        });
    }

    getVehicleClaimByEmpcode(params: {
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

        console.log("params >>> ", queryParams)

        return this._http.get(`${this.baseUrl}/transport-claim/claims`, {
            params: queryParams
        });
    }

    getVehicleByEmpcode(year: string, month: string): Observable<any> {
        const empCode = this.authservice.userData().CODEMPID
        return this._http.get(`${this.baseUrl}/transport-claim/eligible-dates?employee_code=${empCode}&year=${year}&month=${month}`);
    }

    updateVehicleByEmpcode(payload: any): Observable<any> {
        return this._http.post(`${this.baseUrl}/transport-claim`, payload);
    }
}


