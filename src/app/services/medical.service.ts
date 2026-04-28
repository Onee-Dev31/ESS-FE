import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
const FILE_BASE = environment.file_base_url;
import {
  Hospital,
  HospitalSearchResponse,
  DiseaseType,
  DiseaseTypeSearchResponse,
  MedicalExpenseTypeWithBalance,
  MedicalPolicyResponse,
  MedicalClaimsResponse,
  MedicalClaimResponse,
  MedicalStatusesResponse,
} from '../interfaces/medical.interface';
export type {
  Hospital,
  HospitalSearchResponse,
  DiseaseType,
  DiseaseTypeSearchResponse,
  MedicalExpenseTypeWithBalance,
  MedicalPolicyResponse,
  MedicalClaimsResponse,
  MedicalClaimResponse,
  MedicalStatusesResponse,
};

@Injectable({ providedIn: 'root' })
export class MedicalService {
  private readonly baseUrl = environment.api_url;
  private _http = inject(HttpClient);

  /** แปลง relative path ของไฟล์ให้เป็น full URL */
  getFileUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${FILE_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  /**
   * ค้นหาโรงพยาบาล
   * - keyword: กรณีค้นหา → ไม่มี pagination ใน response
   * - ไม่มี keyword: browse mode → มี pagination
   */
  searchHospitals(
    keyword?: string,
    page_no = 1,
    page_size = 20,
  ): Observable<HospitalSearchResponse> {
    let params = new HttpParams().set('page_no', page_no).set('page_size', page_size);
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
  searchDiseaseTypes(
    keyword?: string,
    expense_type_id?: number,
    category?: string,
    page_no = 1,
    page_size = 20,
  ): Observable<DiseaseTypeSearchResponse> {
    let params = new HttpParams().set('page_no', page_no).set('page_size', page_size);
    if (keyword?.trim()) params = params.set('keyword', keyword.trim());
    if (expense_type_id != null) params = params.set('expense_type_id', expense_type_id);
    if (category?.trim()) params = params.set('category', category.trim());
    return this._http.get<DiseaseTypeSearchResponse>(`${this.baseUrl}/medical/disease-types`, {
      params,
    });
  }

  /** ดึงรายการสถานะการเบิก */
  getStatuses(): Observable<MedicalStatusesResponse> {
    return this._http.get<MedicalStatusesResponse>(`${this.baseUrl}/medical/statuses`);
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
    fiscal_year: number,
  ): Observable<{ success: boolean; data: MedicalExpenseTypeWithBalance[] }> {
    const params = new HttpParams()
      .set('employee_code', employee_code)
      .set('fiscal_year', fiscal_year);
    return this._http.get<{ success: boolean; data: MedicalExpenseTypeWithBalance[] }>(
      `${this.baseUrl}/medical/expense-types`,
      { params },
    );
  }

  /**
   * ดึงรายการเบิกค่ารักษาพยาบาลของพนักงาน
   */
  getClaims(params: {
    employee_code?: string;
    from_month?: number;
    from_year?: number;
    to_month?: number;
    to_year?: number;
    status?: string;
    keyword?: string;
  }): Observable<MedicalClaimsResponse> {
    let p = new HttpParams();
    if (params.employee_code?.trim()) p = p.set('employee_code', params.employee_code);
    if (params.from_month != null) p = p.set('from_month', params.from_month);
    if (params.from_year != null) p = p.set('from_year', params.from_year);
    if (params.to_month != null) p = p.set('to_month', params.to_month);
    if (params.to_year != null) p = p.set('to_year', params.to_year);
    if (params.status?.trim()) p = p.set('status', params.status);
    if (params.keyword?.trim()) p = p.set('keyword', params.keyword);
    return this._http.get<MedicalClaimsResponse>(`${this.baseUrl}/medical/claims`, { params: p });
  }

  /**
   * ดึงรายละเอียดการเบิกตาม ID
   */
  getClaimById(id: number, employee_code: string): Observable<MedicalClaimResponse> {
    const p = new HttpParams().set('employee_code', employee_code);
    return this._http.get<MedicalClaimResponse>(`${this.baseUrl}/medical/claims/${id}`, {
      params: p,
    });
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
    if (params.treatment_days != null)
      fd.append('treatment_days', params.treatment_days.toString());
    fd.append('requested_amount', params.requested_amount.toString());
    if (params.remark) fd.append('remark', params.remark);
    params.files?.forEach((f) => fd.append('files', f, f.name));
    params.file_remarks?.forEach((r) => fd.append('file_remarks', r));
    return this._http.post<{ success: boolean; data: any }>(`${this.baseUrl}/medical/claim`, fd);
  }

  updateTypeClaims(id: string | number, payload: any): Observable<any> {
    return this._http.patch(`${this.baseUrl}/medical/claims/${id}/review`, payload);
  }
}
