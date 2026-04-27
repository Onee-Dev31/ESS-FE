import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AllowanceDetail {
  date: string; // วันที่ เช่น "2026-04-10"
  dayType: string; // W = Workday, H = Holiday
  shiftCode: string; // รหัสกะ เช่น "O01"
  timeIn: string; // เวลาเข้า "07:46"
  timeOut: string; // เวลาออก "21:40"
  totalHours: string; // จำนวนชั่วโมง "3:40"
  amount: number; // ยอดเงิน
  remark: string; // รายละเอียดการเบิก
}

export interface AllowanceClaim {
  claimId: number;
  voucherNo: string | null;
  claimDate: string;

  // ข้อมูลพนักงาน
  employeeCode: string;
  employeeName: string | null;
  employeeNickname: string | null;
  employeeImageUrl: string | null;
  departmentName: string | null;
  companyName: string | null;

  // รายการ OT
  details: AllowanceDetail[];

  // สรุปยอด
  totalHours: string;
  requestedAmount: number;
  approvedAmount: number;

  // เอกสารแนบ
  attachments: {
    fileName: string;
    fileUrl: string;
    fileType: string;
  }[];

  status: string;
  remark: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ApprovalAllowanceService {
  private _http = inject(HttpClient);
  FILE_BASE = environment.file_base_url;
  private baseUrl = `${environment.api_url}`;
  // private baseUrl = `${environment.api_url}/approval`;

  getFileUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${this.FILE_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  searchHospitals(keyword?: string, page_no = 1, page_size = 20): Observable<any> {
    let params = new HttpParams().set('page_no', page_no).set('page_size', page_size);
    if (keyword?.trim()) {
      params = params.set('keyword', keyword.trim());
    }
    return this._http.get<any>(`${this.baseUrl}/medical/hospitals`, { params });
  }

  searchDiseaseTypes(
    keyword?: string,
    expense_type_id?: number,
    category?: string,
    page_no = 1,
    page_size = 20,
  ): Observable<any> {
    let params = new HttpParams().set('page_no', page_no).set('page_size', page_size);
    if (keyword?.trim()) params = params.set('keyword', keyword.trim());
    if (expense_type_id != null) params = params.set('expense_type_id', expense_type_id);
    if (category?.trim()) params = params.set('category', category.trim());
    return this._http.get<any>(`${this.baseUrl}/medical/disease-types`, {
      params,
    });
  }

  getStatuses(): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/medical/statuses`);
  }

  getPolicy(): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/medical/policy`);
  }

  getExpenseTypesWithBalance(
    employee_code: string,
    fiscal_year: number,
  ): Observable<{ success: boolean; data: any[] }> {
    const params = new HttpParams()
      .set('employee_code', employee_code)
      .set('fiscal_year', fiscal_year);
    return this._http.get<{ success: boolean; data: any[] }>(
      `${this.baseUrl}/medical/expense-types`,
      { params },
    );
  }

  getClaims(params: {
    employee_code?: string;
    from_month?: number;
    from_year?: number;
    to_month?: number;
    to_year?: number;
    status?: string;
    keyword?: string;
  }): Observable<any> {
    let p = new HttpParams();
    if (params.employee_code?.trim()) p = p.set('employee_code', params.employee_code);
    if (params.from_month != null) p = p.set('from_month', params.from_month);
    if (params.from_year != null) p = p.set('from_year', params.from_year);
    if (params.to_month != null) p = p.set('to_month', params.to_month);
    if (params.to_year != null) p = p.set('to_year', params.to_year);
    if (params.status?.trim()) p = p.set('status', params.status);
    if (params.keyword?.trim()) p = p.set('keyword', params.keyword);
    return this._http.get<any>(`${this.baseUrl}/medical/claims`, { params: p });
  }

  getClaimById(id: number, employee_code: string): Observable<any> {
    const p = new HttpParams().set('employee_code', employee_code);
    return this._http.get<any>(`${this.baseUrl}/medical/claims/${id}`, {
      params: p,
    });
  }

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

  //NEW!!
  reviewClaim(claimId: number, body: any): Observable<any> {
    return this._http.patch<any>(`${this.baseUrl}/meal-allowance/claims/${claimId}/review`, body);
  }

  getPendingApprovals(approver_aduser: string, voucher_no?: string): Observable<any> {
    let p = new HttpParams().set('approver_aduser', approver_aduser);
    if (voucher_no?.trim()) p = p.set('voucher_no', voucher_no.trim());
    return this._http.get<any>(`${this.baseUrl}/meal-allowance/approvals/pending`, { params: p });
  }
}
