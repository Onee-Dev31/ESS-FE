import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GetEmployeesParams {
  pageNumber?: number;
  pageSize?: number;
  searchText?: string | null;
  companyCode?: string | null;
  department?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class MasterService {
  private baseUrl = environment.api_url;

  constructor(private _http: HttpClient) {}

  getEmployees(params: GetEmployeesParams = {}): Observable<any> {
    let httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber ?? 1)
      .set('pageSize', params.pageSize ?? 20);

    if (params.searchText != null) {
      httpParams = httpParams.set('searchText', params.searchText);
    }
    if (params.companyCode != null) {
      httpParams = httpParams.set('companyCode', params.companyCode);
    }
    if (params.department != null) {
      httpParams = httpParams.set('department', params.department);
    }

    return this._http.get(`${this.baseUrl}/getEmployees`, { params: httpParams });
  }
}
