import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, Observable, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EmpAdService {
  private baseUrl = 'http://empad.oneeclick.co:5078/api';

  constructor(private _http: HttpClient) {}

  getEmployees(params?: {
    department?: string;
    empType?: string;
    status?: string;
    pageNumber?: number;
    pageSize?: number;
    searchText?: string;
    companyCode?: string;
    filterAD_USER?: string;
  }): Observable<any> {
    let httpParams = new HttpParams()
      .set('pageNumber', String(params?.pageNumber ?? 1))
      .set('pageSize', String(params?.pageSize ?? 50))
      .set('filterAD_USER', params?.filterAD_USER ?? 'ALL');

    if (params?.department !== undefined)
      httpParams = httpParams.set('department', params.department);
    if (params?.empType !== undefined) httpParams = httpParams.set('empType', params.empType);
    if (params?.status !== undefined) httpParams = httpParams.set('status', params.status);
    if (params?.searchText !== undefined)
      httpParams = httpParams.set('searchText', params.searchText);
    if (params?.companyCode !== undefined)
      httpParams = httpParams.set('companyCode', params.companyCode);

    return this._http.get(`${this.baseUrl}/Employee/GetEmployees`, { params: httpParams });
  }

  getEmployeeDetails(codeEmpId: string): Observable<any> {
    return this._http.get(`${this.baseUrl}/Employee/GetEmployeeDetails/${codeEmpId}`);
  }

  getEmployeeFloors(): Observable<any> {
    return this._http.get(`${this.baseUrl}/EmployeeFloor/GetEmployeeFloors`);
  }

  getJobPositions(): Observable<any> {
    return this._http.get(`${this.baseUrl}/JobPosition`);
  }

  getEmployeeStatuses(): Observable<any> {
    return this._http.get(`${this.baseUrl}/EmployeeStatus/GetEmployeeStatus`);
  }

  getEmployeeBasicInfo(): Observable<any> {
    return this._http.get(`${this.baseUrl}/Employee/GetEmployeeBasicInfo`);
  }
}
