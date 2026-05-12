import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { delay, Observable, of } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class ResignManagementService {
  private baseUrl = environment.api_url;

  constructor(
    private _http: HttpClient,
    private authservice: AuthService,
  ) {}

  getEmployee(params: {
    page?: number;
    pageSize?: number;
    searchText?: string;
    companyCode?: any;
    costCent?: any;
    empStatus?: string;
    adExpiredDate?: string;
  }): Observable<any> {
    const queryParams: any = {};

    if (params.page) queryParams.page = params.page;
    if (params.pageSize) queryParams.perPage = params.pageSize;
    if (params.searchText) queryParams.searchText = params.searchText;
    if (params.companyCode) queryParams.companyCode = params.companyCode;
    if (params.costCent) queryParams.costCent = params.costCent;
    if (params.empStatus) queryParams.empStatus = params.empStatus;
    if (params.adExpiredDate === 'true') queryParams.adExpiredDate = params.adExpiredDate;

    console.log('params >>> ', queryParams);

    return this._http.get<any>(`${this.baseUrl}/employees`, {
      params: queryParams,
    });
  }

  resignEmployee(payload: any): Observable<any> {
    // console.log(payload)
    return this._http.post(`${this.baseUrl}/employee-resignations`, payload);
  }

  updateEmployeeResign(id: string, payload: any): Observable<any> {
    // console.log(payload)
    return this._http.put(`${this.baseUrl}/employee-resignations/${id}`, payload);
  }

  deleteEmployeeResign(id: string): Observable<any> {
    return this._http.delete(`${this.baseUrl}/employee-resignations/${id}`);
  }

  resignEmployees(payload: any): Observable<any> {
    return this._http.post(`${this.baseUrl}/employee-resignations/bulk`, payload);
  }

  updateADManagementResign(payload: any): Observable<any> {
    return this._http.post(`${this.baseUrl}/ADManagement/set-account-expire-batch`, payload);
  }

  getReportResignEmployees(params: {
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

    // const headers = new HttpHeaders({
    //   'Authorization': `Bearer ${this.authservice.allData().accessToken}`,
    //   'Content-Type': 'application/json'
    // });

    return this._http.get<any>(`${this.baseUrl}/employees-with-ad`, {
      params: queryParams,
    });
  }
}
