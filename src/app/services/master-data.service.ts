/** Service สำหรับจัดการข้อมูลพื้นฐาน (Master Data) ของระบบ เช่น ประเภทการลา และประเภทการเบิก */
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { shareReplay, delay } from 'rxjs/operators';

import { DateConfig } from '../interfaces/core.interface';
import { environment } from '../../environments/environment';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { SKIP_ERROR_TOAST } from '../interceptors/error.interceptor';
import {
  ClaimAllowanceRate,
  UpsertClaimAllowanceRatePayload,
} from '../interfaces/allowance.interface';
import {
  MedicalBenefitPlan,
  UpsertMedicalBenefitPlanPayload,
} from '../interfaces/medical.interface';
import {
  GetWelfareResponsibilityResponse,
  SaveWelfareResponsibilityItem,
  SaveWelfareResponsibilityResponse,
  SearchWelfareResponsibilityParams,
} from '../interfaces/hr-welfare.interface';
import { CompanyWelfarePayload } from '../interfaces/welfare.interface';
export interface ClaimType {
  id: string;
  label: string;
  amount: string;
  icon: string;
  color: string;
  group: 'outpatient' | 'inpatient';
  disabled?: boolean;
  disabledReason?: string;
  helperText?: string;
  ruleBadge?: string;
  requiresEligibilityCheck?: boolean;
  guidanceText?: string;
}

@Injectable({
  providedIn: 'root',
})
export class MasterDataService {
  private baseUrl = environment.api_url;

  private claimTypesCache$: Observable<ClaimType[]> | null = null;
  private dateConfigCache$: Observable<DateConfig> | null = null;

  constructor(private _http: HttpClient) {}

  /** ดึงรายการประเภทการเบิกค่ารักษาพยาบาล */
  getMedicalClaimTypes(): Observable<ClaimType[]> {
    if (!this.claimTypesCache$) {
      const types: ClaimType[] = [
        {
          id: 'opd',
          label: 'ผู้ป่วยนอก (OPD)',
          amount: '10,500',
          icon: 'fas fa-stethoscope',
          color: 'var(--danger)',
          group: 'outpatient',
        },
        {
          id: 'dental',
          label: 'ทันตกรรม',
          amount: '584',
          icon: 'fas fa-tooth',
          color: 'var(--primary)',
          group: 'outpatient',
        },
        {
          id: 'vision',
          label: 'สายตา',
          amount: '876',
          icon: 'fas fa-glasses',
          color: 'var(--primary)',
          group: 'outpatient',
        },
        {
          id: 'ipd',
          label: 'ผู้ป่วยใน',
          amount: '3,500',
          icon: 'fas fa-user-md',
          color: 'var(--success)',
          group: 'inpatient',
        },
      ];
      this.claimTypesCache$ = of(types).pipe(delay(500), shareReplay(1));
    }
    return this.claimTypesCache$;
  }

  getDateConfig(): Observable<DateConfig> {
    if (!this.dateConfigCache$) {
      const config = {
        months: [
          'มกราคม',
          'กุมภาพันธ์',
          'มีนาคม',
          'เมษายน',
          'พฤษภาคม',
          'มิถุนายน',
          'กรกฎาคม',
          'สิงหาคม',
          'กันยายน',
          'ตุลาคม',
          'พฤศจิกายน',
          'ธันวาคม',
        ],
        years: [2568, 2569, 2570],
      };
      this.dateConfigCache$ = of(config).pipe(delay(300), shareReplay(1));
    }
    return this.dateConfigCache$;
  }

  /* MASTER API*/

  getBankMaster(): Observable<any> {
    return this._http.get(`${this.baseUrl}/Master/banks`);
  }

  getCompanyMaster(): Observable<any> {
    return this._http.get(`${this.baseUrl}/Master/companies`);
  }

  getDepartmentMaster(): Observable<any> {
    return this._http.get(`${this.baseUrl}/Master/company-costcent`);
  }

  getRoleMaster(): Observable<any> {
    return this._http.get(`${this.baseUrl}/Master/roles/active`);
  }

  manageHolidayMaster(payload: any): Observable<any> {
    return this._http.post(`${this.baseUrl}/Master/manage-holiday`, payload, {
      context: new HttpContext().set(SKIP_ERROR_TOAST, true),
    });
  }

  downloadHolidayTemplate(year?: string): Observable<Blob> {
    let httpParams = new HttpParams();
    if (year) httpParams = httpParams.set('year', year);
    return this._http.get(`${this.baseUrl}/Master/manage-holiday/template`, {
      params: httpParams,
      responseType: 'blob',
    });
  }

  importHolidayExcel(formData: FormData): Observable<any> {
    return this._http.post(`${this.baseUrl}/Master/manage-holiday/import`, formData, {
      context: new HttpContext().set(SKIP_ERROR_TOAST, true),
    });
  }

  MasterPermission(): Observable<any> {
    return this._http.get(`${this.baseUrl}/Master/MasterPermission`);
  }

  /** GET api/Master/GetClaimAllowanceRates */
  getClaimAllowanceRates(): Observable<ClaimAllowanceRate[]> {
    return this._http.get<ClaimAllowanceRate[]>(`${this.baseUrl}/Master/GetClaimAllowanceRates`);
  }

  /** POST api/Master/UpsertClaimAllowanceRates */
  upsertClaimAllowanceRate(payload: UpsertClaimAllowanceRatePayload): Observable<any> {
    return this._http.post(`${this.baseUrl}/Master/UpsertClaimAllowanceRates`, payload);
  }

  /** GET api/Master/GetMedicalBenefitPlans */
  getMedicalBenefitPlans(): Observable<MedicalBenefitPlan[]> {
    return this._http.get<MedicalBenefitPlan[]>(`${this.baseUrl}/Master/GetMedicalBenefitPlans`);
  }

  /** POST api/Master/UpsertMedicalBenefitPlans */
  upsertMedicalBenefitPlan(payload: UpsertMedicalBenefitPlanPayload): Observable<any> {
    return this._http.post(`${this.baseUrl}/Master/UpsertMedicalBenefitPlans`, payload);
  }

  /** GET api/welfare/responsibility — HR ผู้รับผิดชอบสวัสดิการ ทั้งหมด */
  getWelfareResponsibilities(): Observable<GetWelfareResponsibilityResponse> {
    return this._http.get<GetWelfareResponsibilityResponse>(
      `${this.baseUrl}/welfare/responsibility`,
    );
  }

  /** GET api/welfare/responsibility/search — filter ฝั่ง server (search/hrCodeEmp/welfareCode/companyCode),
   * ไม่ใส่ filter เลย = คืนทุกคนเหมือน getWelfareResponsibilities() */
  searchWelfareResponsibilities(
    filters: SearchWelfareResponsibilityParams,
  ): Observable<GetWelfareResponsibilityResponse> {
    let params = new HttpParams();
    if (filters.search) params = params.set('search', filters.search);
    if (filters.hrCodeEmp) params = params.set('hrCodeEmp', filters.hrCodeEmp);
    if (filters.welfareCode) params = params.set('welfareCode', filters.welfareCode);
    if (filters.companyCode) params = params.set('companyCode', filters.companyCode);
    return this._http.get<GetWelfareResponsibilityResponse>(
      `${this.baseUrl}/welfare/responsibility/search`,
      { params },
    );
  }

  /** POST api/welfare/responsibility — บันทึกได้หลายแถวต่อ 1 request (id มี = update, ไม่มี/0 = insert) */
  saveWelfareResponsibilities(
    items: SaveWelfareResponsibilityItem[],
  ): Observable<SaveWelfareResponsibilityResponse> {
    return this._http.post<SaveWelfareResponsibilityResponse>(
      `${this.baseUrl}/welfare/responsibility`,
      items,
    );
  }

  /** DELETE api/welfare/responsibility/{id} */
  deleteWelfareResponsibility(
    id: number,
    executedBy: string,
  ): Observable<{ success: boolean; message: string }> {
    return this._http.delete<{ success: boolean; message: string }>(
      `${this.baseUrl}/welfare/responsibility/${id}`,
      { params: new HttpParams().set('executedBy', executedBy) },
    );
  }

  /** GET api/Master/company-welfares — master ประเภทสวัสดิการ (ผูกคู่กับ CompanyCode, อาจมีหลายแถวต่อ WelfareCode เดียวกัน) */
  getCompanyWelfares(): Observable<any> {
    return this._http.get(`${this.baseUrl}/Master/company-welfares`);
  }

  /** GET api/Master/hr-personnel — รายชื่อ HR จริงข้ามบริษัททั้งเครือ (CODEMPID/FULLNAME/COMPANY_CODE) */
  getHrPersonnel(): Observable<any> {
    return this._http.get(`${this.baseUrl}/Master/hr-personnel`);
  }

  /** GET api/Master/company-welfares/{companyCode}/{welfareCode} */
  getCompanyWelfare(companyCode: string, welfareCode: string): Observable<any> {
    return this._http.get(`${this.baseUrl}/Master/company-welfares/${companyCode}/${welfareCode}`);
  }

  /** POST api/Master/company-welfares */
  createCompanyWelfare(payload: CompanyWelfarePayload): Observable<any> {
    return this._http.post(`${this.baseUrl}/Master/company-welfares`, payload);
  }

  /** PUT api/Master/company-welfares/{id} */
  updateCompanyWelfare(id: number, payload: CompanyWelfarePayload): Observable<any> {
    return this._http.put(`${this.baseUrl}/Master/company-welfares/${id}`, payload);
  }

  /** DELETE api/Master/company-welfares/{id} */
  deleteCompanyWelfare(id: number): Observable<any> {
    return this._http.delete(`${this.baseUrl}/Master/company-welfares/${id}`);
  }
}
