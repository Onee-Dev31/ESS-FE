import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError, of, retry } from 'rxjs';
import { SKIP_ERROR_TOAST } from '../interceptors/error.interceptor';
import { environment } from '../../environments/environment';
import { MealAllowanceClaimsResponse, MealAllowanceRate, MealAllowanceRatesResponse, EligibleDatesResponse, CreateClaimRequest, CreateClaimResponse } from '../interfaces/allowance.interface';
export type { MealAllowanceClaimsResponse };

@Injectable({ providedIn: 'root' })
export class AllowanceApiService {
    private readonly baseUrl = environment.api_url;
    private _http = inject(HttpClient);

    /** Cache ผลลัพธ์ล่าสุดไว้แสดงทันทีเมื่อ navigate กลับมา */
    readonly lastResponse = signal<MealAllowanceClaimsResponse | null>(null);

    /** อัตราเบี้ยเลี้ยงจาก API */
    readonly rates = signal<MealAllowanceRate[]>([]);

    constructor() {
        this.reloadRates();
    }

    /** โหลด rates ใหม่ (เรียกได้จากภายนอก) */
    reloadRates(): void {
        this.getRates().pipe(
            retry(2),
            catchError(() => of({ success: false, data: [] as MealAllowanceRate[] }))
        ).subscribe(res => {
            if (res.success && res.data.length) this.rates.set(res.data);
        });
    }

    /** GET api/meal-allowance/rates */
    getRates(): Observable<MealAllowanceRatesResponse> {
        const context = new HttpContext().set(SKIP_ERROR_TOAST, true);
        return this._http.get<MealAllowanceRatesResponse>(`${this.baseUrl}/meal-allowance/rates`, { context });
    }

    /**
     * คำนวณเบี้ยเลี้ยงตาม extraHours โดยใช้ rates จาก API
     * ถ้ายังโหลดไม่เสร็จจะคืน 0
     */
    calculateAmount(extraHours: number): number {
        const rateList = this.rates();
        if (!rateList.length || extraHours < rateList[0].min_hours) return 0;
        // เรียงตาม max_hours แล้วหา rate แรกที่ extraHours ≤ max_hours
        const sorted = [...rateList].sort((a, b) => a.max_hours - b.max_hours);
        const matched = sorted.find(r => extraHours <= r.max_hours);
        return matched?.rate_amount ?? sorted[sorted.length - 1].rate_amount;
    }

    /**
     * ดึงวันที่มีสิทธิ์เบิกเบี้ยเลี้ยงของพนักงาน
     * GET api/meal-allowance/eligible-dates
     */
    getEligibleDates(employee_code: string, year: number, month: number): Observable<EligibleDatesResponse> {
        const params = new HttpParams()
            .set('employee_code', employee_code)
            .set('year', year)
            .set('month', month);
        return this._http.get<EligibleDatesResponse>(`${this.baseUrl}/meal-allowance/eligible-dates`, { params });
    }

    /**
     * สร้างใบเบิกเบี้ยเลี้ยง
     * POST api/meal-allowance/claim
     */
    createClaim(request: CreateClaimRequest): Observable<CreateClaimResponse> {
        return this._http.post<CreateClaimResponse>(`${this.baseUrl}/meal-allowance/claim`, request);
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
        if (params.date_from?.trim())     p = p.set('date_from', params.date_from);
        if (params.date_to?.trim())       p = p.set('date_to', params.date_to);
        if (params.status?.trim())        p = p.set('status', params.status);
        if (params.search?.trim())        p = p.set('search', params.search);
        if (params.page_number != null)   p = p.set('page_number', params.page_number);
        if (params.page_size   != null)   p = p.set('page_size', params.page_size);
        return this._http.get<MealAllowanceClaimsResponse>(
            `${this.baseUrl}/meal-allowance/claims`, { params: p }
        ).pipe(tap(res => this.lastResponse.set(res)));
    }
}
