import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Hospital, HospitalSearchResponse, DiseaseType, DiseaseTypeSearchResponse, MedicalExpenseTypeWithBalance, MedicalPolicyResponse } from '../interfaces/medical.interface';
export type { Hospital, HospitalSearchResponse, DiseaseType, DiseaseTypeSearchResponse, MedicalExpenseTypeWithBalance, MedicalPolicyResponse };

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
     * ค้นหาประเภทโรค
     * - keyword: ค้นหาตาม name_th / name_en / icd10_code → ไม่มี pagination
     * - ไม่มี keyword: browse mode → มี pagination
     */
    searchDiseaseTypes(keyword?: string, expense_type_id?: number, category?: string, page_no = 1, page_size = 20): Observable<DiseaseTypeSearchResponse> {
        let params = new HttpParams()
            .set('page_no', page_no)
            .set('page_size', page_size);
        if (keyword?.trim())       params = params.set('keyword', keyword.trim());
        if (expense_type_id != null) params = params.set('expense_type_id', expense_type_id);
        if (category?.trim())      params = params.set('category', category.trim());
        return this._http.get<DiseaseTypeSearchResponse>(`${this.baseUrl}/medical/disease-types`, { params });
    }

    /** ดึงนโยบายและสิทธิประโยชน์ค่ารักษาพยาบาล */
    getPolicy(): Observable<MedicalPolicyResponse> {
        return this._http.get<MedicalPolicyResponse>(`${this.baseUrl}/medical/policy`);
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

    /**
     * ส่งเรื่องเบิกค่ารักษาพยาบาล (multipart/form-data)
     */
    submitClaim(params: {
        employee_code: string;
        expense_type_id: number;
        hospital_id: number;
        disease_id: number;
        treatment_date_from: string;
        treatment_date_to: string;
        treatment_days?: number;
        requested_amount: number;
        remark?: string;
        files?: File[];
        file_remarks?: string[];
    }): Observable<{ success: boolean; data: any }> {
        const fd = new FormData();
        fd.append('employee_code', params.employee_code);
        fd.append('expense_type_id', params.expense_type_id.toString());
        fd.append('hospital_id', params.hospital_id.toString());
        fd.append('disease_id', params.disease_id.toString());
        fd.append('treatment_date_from', params.treatment_date_from);
        fd.append('treatment_date_to', params.treatment_date_to);
        if (params.treatment_days != null) fd.append('treatment_days', params.treatment_days.toString());
        fd.append('requested_amount', params.requested_amount.toString());
        if (params.remark) fd.append('remark', params.remark);
        params.files?.forEach(f => fd.append('files', f, f.name));
        params.file_remarks?.forEach(r => fd.append('file_remarks', r));
        return this._http.post<{ success: boolean; data: any }>(`${this.baseUrl}/medical/claim`, fd);
    }
}
