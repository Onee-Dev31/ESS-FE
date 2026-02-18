/** Service สำหรับจัดการข้อมูลพื้นฐาน (Master Data) ของระบบ เช่น ประเภทการลา และประเภทการเบิก */
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { DateConfig } from '../interfaces/core.interface';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class FreelanceService {

    private baseUrl = environment.api_url;

    constructor(private _http: HttpClient) { }

    createFreelance(formData: FormData): Observable<any> {
        return this._http.post(`${this.baseUrl}/Freelance/operation`, formData);
    }

    getFreelance(params: {
        page?: number;
        pageSize?: number;
        searchText?: string;
        companyCode?: string;
        costCent?: string;
    }): Observable<any> {

        const queryParams: any = {};

        if (params.page) queryParams.page = params.page;
        if (params.pageSize) queryParams.pageSize = params.pageSize;
        if (params.searchText) queryParams.searchText = params.searchText;
        if (params.companyCode) queryParams.companyCode = params.companyCode;
        if (params.costCent) queryParams.costCent = params.costCent;

        console.log("params >>> ", queryParams)

        return this._http.get<any>(`${this.baseUrl}/Freelance`, {
            params: queryParams
        });

    }


}
