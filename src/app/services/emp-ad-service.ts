import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, Observable, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EmpAdService {
  private baseUrl = 'https://oneeuserapi.oneeclick.co/api';
  private empUrl = environment.api_url;

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

  insertEmployee(payload: any): Observable<any> {
    return this._http.post(`${this.baseUrl}/Employee/InsertEmployee`, payload);
  }

  getAdUserInfo(samAccountName: string): Observable<any> {
    return this._http.get(`${this.baseUrl}/ActiveDirectory/GetUserInfo`, {
      params: new HttpParams().set('samAccountName', samAccountName),
    });
  }

  lockUserAccount(samAccountName: string): Observable<any> {
    return this._http.post(`${this.baseUrl}/ActiveDirectory/LockUserAccount`, null, {
      params: new HttpParams().set('samAccountName', samAccountName),
      responseType: 'text',
    });
  }

  unlockUser(samAccountName: string): Observable<any> {
    return this._http.post(`${this.baseUrl}/ActiveDirectory/UnlockUser`, null, {
      params: new HttpParams().set('samAccountName', samAccountName),
      responseType: 'text',
    });
  }

  disableAccount(samAccountName: string): Observable<any> {
    return this._http.post(`${this.baseUrl}/ActiveDirectory/disable-account`, null, {
      params: new HttpParams().set('samAccountName', samAccountName),
      responseType: 'text',
    });
  }

  enableAccount(samAccountName: string): Observable<any> {
    return this._http.post(`${this.baseUrl}/ActiveDirectory/enable-account`, null, {
      params: new HttpParams().set('samAccountName', samAccountName).set('newPassword', 'P@ssw0rd'),
      responseType: 'text',
    });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this._http.post(
      `${this.baseUrl}/ActiveDirectory/ResetPassword`,
      { token, newPassword },
      {
        responseType: 'text',
      },
    );
  }

  extendPasswordExpiration(samAccountName: string): Observable<any> {
    return this._http.post(
      `${this.baseUrl}/ActiveDirectory/ExtendPasswordExpirationSimulated`,
      null,
      {
        params: new HttpParams().set('samAccountName', samAccountName),
        responseType: 'text',
      },
    );
  }

  updateEmployeeX1(params: {
    codeMpId: string;
    adUser: string;
    empTypeId?: number | null;
    staEmp?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    email?: string;
    jobTitle?: string;
    department?: string;
    company?: string;
    description?: string;
    adUserOld?: string;
  }): Observable<any> {
    let httpParams = new HttpParams().set('codeMpId', params.codeMpId).set('adUser', params.adUser);
    if (params.empTypeId != null)
      httpParams = httpParams.set('empTypeId', String(params.empTypeId));
    if (params.staEmp) httpParams = httpParams.set('staEmp', params.staEmp);
    if (params.firstName) httpParams = httpParams.set('firstName', params.firstName);
    if (params.lastName) httpParams = httpParams.set('lastName', params.lastName);
    if (params.displayName) httpParams = httpParams.set('displayName', params.displayName);
    if (params.email) httpParams = httpParams.set('email', params.email);
    if (params.jobTitle) httpParams = httpParams.set('jobTitle', params.jobTitle);
    if (params.department) httpParams = httpParams.set('department', params.department);
    if (params.company) httpParams = httpParams.set('company', params.company);
    if (params.description) httpParams = httpParams.set('description', params.description);
    if (params.adUserOld) httpParams = httpParams.set('adUserOld', params.adUserOld);
    return this._http.put(`${this.baseUrl}/Employee/UpdateEmployeeX1`, null, {
      params: httpParams,
      responseType: 'text',
    });
  }

  getfreelanceCode(comcode: string): Observable<any> {
    return this._http.get(`${this.empUrl}/getfreelanceCode`, {
      params: new HttpParams().set('companycode', comcode),
    });
  }
}
