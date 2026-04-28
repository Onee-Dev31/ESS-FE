/** Service สำหรับจัดการข้อมูลคำขอเบี้ยเลี้ยง (Allowance) และคำนวณเบี้ยเลี้ยงตามชั่วโมงงาน */
import { Observable, of, delay, tap } from 'rxjs';
import {
  AllowanceItem,
  AllowanceRequest,
  CreateClaimRequest,
  CreateClaimResponse,
  EligibleDatesResponse,
  MealAllowanceClaimDetail,
  MealAllowanceClaimsResponse,
  MealAllowanceRate,
  MealAllowanceRatesResponse,
} from '../interfaces/allowance.interface';
import { AllowanceMock } from '../mocks/allowance.mock';
import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export type { AllowanceItem, AllowanceRequest };

@Injectable({
  providedIn: 'root',
})
export class AllowanceService extends BaseRequestService<AllowanceRequest> {
  protected override readonly STORAGE_KEY = STORAGE_KEYS.MOCK_ALLOWANCE_DATA;
  private allowanceApi = inject(AllowanceApiService);

  constructor() {
    super();
    this.initializeData(() => AllowanceMock.generateRequestsByRole(20, 'Admin'));
  }

  getAllowanceRequests(): Observable<AllowanceRequest[]> {
    return this.getRequests();
  }

  /**
   * ดึงรายการเบิกเบี้ยเลี้ยง
   * GET api/meal-allowance/claims
   */
  getClaims(params: {
    employee_code?: string;
    date_from?: string;
    date_to?: string;
    status?: string;
    search?: string;
    page_number?: number;
    page_size?: number;
  }): Observable<MealAllowanceClaimsResponse> {
    let p = new HttpParams();
    if (params.employee_code?.trim()) p = p.set('employee_code', params.employee_code);
    if (params.date_from?.trim()) p = p.set('date_from', params.date_from);
    if (params.date_to?.trim()) p = p.set('date_to', params.date_to);
    if (params.status?.trim()) p = p.set('status', params.status);
    if (params.search?.trim()) p = p.set('search', params.search);
    if (params.page_number != null) p = p.set('page_number', params.page_number);
    if (params.page_size != null) p = p.set('page_size', params.page_size);
    return this._http
      .get<MealAllowanceClaimsResponse>(`${this.baseUrl}/meal-allowance/claims`, { params: p })
      .pipe(tap((res) => this.lastResponse.set(res)));
  }

  /**
   * ดึงวันที่มีสิทธิ์เบิกเบี้ยเลี้ยงของพนักงาน
   * GET api/meal-allowance/eligible-dates
   */
  getEligibleDates(
    employee_code: string,
    year: number,
    month: number,
  ): Observable<EligibleDatesResponse> {
    const params = new HttpParams()
      .set('employee_code', employee_code)
      .set('year', year)
      .set('month', month);
    return this._http.get<EligibleDatesResponse>(`${this.baseUrl}/meal-allowance/eligible-dates`, {
      params,
    });
  }

  /**
   * สร้างใบเบิกเบี้ยเลี้ยง
   * POST api/meal-allowance/claim
   */
  createClaim(request: CreateClaimRequest): Observable<CreateClaimResponse> {
    console.log(request);
    return this._http.post<CreateClaimResponse>(`${this.baseUrl}/meal-allowance/claim`, request);
  }

  /**
   * แก้ไขใบเบิกเบี้ยเลี้ยง
   * PUT api/meal-allowance/claim/:id
   */
  updateClaim(claimId: number, body: { details: MealAllowanceClaimDetail[] }): Observable<any> {
    return this._http.put(`${this.baseUrl}/meal-allowance/claim/${claimId}`, body);
  }

  /**
   * ลบใบเบิกเบี้ยเลี้ยง
   * DELETE api/meal-allowance/claim/:id
   */
  deleteClaim(claimId: number): Observable<any> {
    return this._http.delete(`${this.baseUrl}/meal-allowance/claim/${claimId}`);
  }

  updateStatusClaim(claimId: number, body: any): Observable<any> {
    console.log(claimId, body);
    return this._http.patch<any>(`${this.baseUrl}/meal-allowance/claims/${claimId}/review`, body);
  }

  getApprovals(approver_aduser: string, voucher_no?: string, status?: string): Observable<any> {
    let p = new HttpParams().set('approver_aduser', approver_aduser);
    if (voucher_no?.trim()) p = p.set('voucher_no', voucher_no.trim());
    if (status?.trim()) p = p.set('status', status.trim());
    return this._http.get<any>(`${this.baseUrl}/meal-allowance/approvals`, { params: p });
  }

  getClaimById(claimId: number): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/meal-allowance/claims/${claimId}`);
  }
}
