import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Hospital, HospitalSearchResponse, MedicalExpenseTypeWithBalance } from '../interfaces/medical.interface';
export type { Hospital, HospitalSearchResponse, MedicalExpenseTypeWithBalance };

@Injectable({ providedIn: 'root' })
export class MedicalApiService {
    private readonly baseUrl = environment.api_url;
    private _http = inject(HttpClient);

    /**
     * ค้นหาโรงพยาบาล
     * - keyword: กรณีค้นหา → ไม่มี pagination ใน response
     * - ไม่มี keyword: browse mode → มี pagination
     */
    searchHospitals(keyword?: string, page_no = 1, page_size = 20): Observable<HospitalSearchResponse> {
        let params = new HttpParams()
            .set('page_no', page_no)
            .set('page_size', page_size);
        if (keyword?.trim()) {
            params = params.set('keyword', keyword.trim());
        }
        return this._http.get<HospitalSearchResponse>(`${this.baseUrl}/medical/hospitals`, { params });
    }

    /**
     * ดึงประเภทการเบิกพร้อมยอดคงเหลือของพนักงาน
     */
    getExpenseTypesWithBalance(
        employee_code: string,
        fiscal_year: number
    ): Observable<{ success: boolean; data: MedicalExpenseTypeWithBalance[] }> {
        const params = new HttpParams()
            .set('employee_code', employee_code)
            .set('fiscal_year', fiscal_year);
        return this._http.get<{ success: boolean; data: MedicalExpenseTypeWithBalance[] }>(
            `${this.baseUrl}/medical/expense-types`,
            { params }
        );
    }
}
