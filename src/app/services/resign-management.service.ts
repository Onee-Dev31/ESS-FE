import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ResignManagementService {
  private baseUrl = environment.api_url;

  constructor(private _http: HttpClient) { }

  getEmployee(params: {
    page?: number;
    pageSize?: number;
    searchText?: string;
    company?: any;
    department?: any;
  }): Observable<any> {
    const queryParams: any = {};

    if (params.page) queryParams.page = params.page;
    if (params.pageSize) queryParams.perPage = params.pageSize;
    if (params.searchText) queryParams.searchText = params.searchText;
    if (params.company) queryParams.companyCode = params.company.COMPANY_CODE;
    if (params.department) queryParams.costCent = params.department.COSTCENT;

    // console.log("params >>> ", queryParams)

    return this._http.get<any>(`${this.baseUrl}/employees`, {
      params: queryParams
    });
  }

}
