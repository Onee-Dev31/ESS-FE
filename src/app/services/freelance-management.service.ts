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

    getFreelance(page?: number, pageSize?: number): Observable<any> {

        let params = new HttpParams();

        if (page !== undefined && page !== null) {
            params = params.set('page', page.toString());
        }

        if (pageSize !== undefined && pageSize !== null) {
            params = params.set('pageSize', pageSize.toString());
        }

        console.log("params : ", params)

        return this._http.get(`${this.baseUrl}/Freelance`, { params });
    }


}
