import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { delay, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SettingService {
  private baseUrl = environment.api_url;

  constructor(private _http: HttpClient) { }

  // MENU
  getMenu(): Observable<any> {
    return this._http.get(`${this.baseUrl}/Master/all-menus`);
  }

  createMenu(payload: any): Observable<any> {
    return this._http.post(`${this.baseUrl}/Master/menu`, payload);
  }

  updateMenuRolePermission(menuID: string, payload: any): Observable<any> {
    return this._http.post(`${this.baseUrl}/Master/menu-role-permissions?menuID=${menuID}`, payload);
  }

  updateMenu(payload: any): Observable<any> {
    return this._http.post(`${this.baseUrl}/Master/update-menu-data`, payload);
  }

  // EMPLOYEE
  getEmployee(params: {
    page?: number;
    pageSize?: number;
    searchText?: string;
    companyCode?: any;
    costCent?: any;
    roleName?: any;
  }): Observable<any> {
    const queryParams: any = {};

    if (params.page) queryParams.page = params.page;
    if (params.pageSize) queryParams.pageSize = params.pageSize;
    if (params.searchText) queryParams.search = params.searchText;
    if (params.companyCode) queryParams.companyCode = params.companyCode;
    if (params.costCent) queryParams.costCent = params.costCent;
    if (params.roleName) queryParams.roleName = params.roleName;
    // if (params.empStatus) queryParams.empStatus = params.empStatus;

    console.log("params >>> ", queryParams)

    return this._http.get<any>(`${this.baseUrl}/Master/employees`, {
      params: queryParams
    });
  }

  settingUserRole(payload: any): Observable<any> {
    console.log(payload)
    return this._http.post(`${this.baseUrl}/Master/user-roles`, payload);
  }

}
