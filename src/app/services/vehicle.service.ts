import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class VehicleService {
  private baseUrl = environment.api_url;
  private ONEEJOB_url = environment.api_ONEEJOB_url;
  FILE_BASE = environment.file_base_url;

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
      params: queryParams,
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

    // console.log("params >>> ", queryParams)

    return this._http.get(`${this.baseUrl}/transport-claim/claims`, {
      params: queryParams,
    });
  }

  getVehicleByEmpcode(year: string, month: string): Observable<any> {
    const empCode = this.authservice.userData().CODEMPID;
    return this._http.get(
      `${this.baseUrl}/transport-claim/eligible-dates?employee_code=${empCode}&year=${year}&month=${month}`,
    );
  }

  createVehicleByEmpcode(payload: any): Observable<any> {
    return this._http.post(`${this.baseUrl}/transport-claim`, payload);
  }

  updateVehicleByClaimId(id: string, payload: any): Observable<any> {
    return this._http.patch(`${this.baseUrl}/transport-claim/${id}`, payload);
  }

  deleteVehicleByEmpCode(id: string, empCode: string): Observable<any> {
    return this._http.delete(`${this.baseUrl}/transport-claim/${id}?employee_code=${empCode}`);
  }

  // NEW!!

  getFileUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${this.FILE_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  }
  updateStatusClaim(claimId: number, body: any): Observable<any> {
    console.log(claimId, body);
    return this._http.patch<any>(`${this.baseUrl}/transport-claim/claims/${claimId}/review`, body);
  }

  getApprovals(approver_aduser: string, voucher_no?: string, status?: string): Observable<any> {
    let p = new HttpParams().set('approver_aduser', approver_aduser);
    if (voucher_no?.trim()) p = p.set('voucher_no', voucher_no.trim());
    if (status?.trim()) p = p.set('status', status.trim());
    return this._http.get<any>(`${this.baseUrl}/transport-claim/approvals`, { params: p });
  }

  getClaimById(claimId: number): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/transport-claim/claims/${claimId}`);
  }
}
