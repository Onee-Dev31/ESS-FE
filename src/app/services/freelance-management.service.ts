/** Service สำหรับจัดการข้อมูลพื้นฐาน (Master Data) ของระบบ เช่น ประเภทการลา และประเภทการเบิก */
import { Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';

import { DateConfig } from '../interfaces/core.interface';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class FreelanceService {
  private baseUrl = environment.api_url;

  constructor(private _http: HttpClient) {}

  createFreelance(formData: FormData): Observable<any> {
    // console.log(formData)
    return this._http.post(`${this.baseUrl}/Freelance/operation`, formData);
  }

  getFreelance(params: {
    page?: number;
    pageSize?: number;
    searchText?: string;
    companyCode?: string;
    costCent?: string;
    empStatus?: string;
    hasAdUser?: string;
    adExpiredDate?: string;
  }): Observable<any> {
    const queryParams: any = {};

    if (params.page) queryParams.page = params.page;
    if (params.pageSize) queryParams.pageSize = params.pageSize;
    if (params.searchText) queryParams.searchText = params.searchText;
    if (params.companyCode) queryParams.companyCode = params.companyCode;
    if (params.costCent) queryParams.costCent = params.costCent;
    if (params.empStatus) queryParams.empStatus = params.empStatus;
    if (params.hasAdUser === 'false') queryParams.hasAdUser = params.hasAdUser;
    if (params.adExpiredDate === 'true') queryParams.adExpiredDate = params.adExpiredDate;

    // console.log("params >>> ", queryParams)

    return this._http.get<any>(`${this.baseUrl}/Freelance`, {
      params: queryParams,
    });
  }

  getFreelanceAll(params: {
    searchText?: string;
    companyCode?: string;
    costCent?: string;
    empStatus?: string;
    hasAdUser?: string;
  }): Observable<any> {
    const queryParams: any = {};
    if (params.searchText) queryParams.searchText = params.searchText;
    if (params.companyCode) queryParams.companyCode = params.companyCode;
    if (params.costCent) queryParams.costCent = params.costCent;
    if (params.empStatus) queryParams.empStatus = params.empStatus;
    if (params.hasAdUser === 'false') queryParams.hasAdUser = params.hasAdUser;

    // console.log("params >>> ", queryParams)

    return this._http.get<any>(`${this.baseUrl}/Freelance/all`, {
      params: queryParams,
    });
  }

  getFreelanceById(id: any): Observable<any> {
    return this._http.get(`${this.baseUrl}/Freelance/${id}`);
  }

  async convertToFile(fileInfo: any): Promise<File> {
    const blob = await firstValueFrom(this._http.get(fileInfo.FILE_DIR, { responseType: 'blob' }));

    return new File([blob], fileInfo.FILE_NAME, { type: fileInfo.FILE_TYPE });
  }
}
