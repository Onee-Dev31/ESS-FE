import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApprovalSetupService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.api_url}/approval`;

  // GET /api/approval/setup
  getApprovalSetupList(params?: {
    search?: string;
    companyCode?: string;
    onlySkip?: boolean;
  }): Observable<any> {
    let httpParams = new HttpParams();
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.companyCode) httpParams = httpParams.set('companyCode', params.companyCode);
    if (params?.onlySkip !== undefined)
      httpParams = httpParams.set('onlySkip', String(params.onlySkip));

    return this.http.get<any>(`${this.baseUrl}/setup`, {
      params: httpParams,
    });
  }

  // GET /api/approval/setup/:costCent
  getApprovalSetupByCostCenter(costCent: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/setup/${costCent}`);
  }

  // POST /api/approval/setup/save
  saveApprovalSetup(request: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/setup/save`, request);
  }

  // GET /api/approval/employees/search
  searchEmployees(keyword: string): Observable<any> {
    const params = new HttpParams().set('keyword', keyword);
    return this.http.get<any>(`${this.baseUrl}/employees/search`, {
      params,
    });
  }

  // GET /api/approval/categories (default/reset)
  getApprovalSetupChain(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/categories`);
  }

  // GET /api/approval/categories/current (latest saved)
  getApprovalSetupChainCurrent(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/categories/current`);
  }

  // PUT /api/approval/categories
  saveApprovalCategories(
    categories: {
      categoryId: number;
      skipApprover1: boolean;
      skipApprover2: boolean;
      skipApprover3: boolean;
      skipApprover4: boolean;
    }[],
  ): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/categories`, { categories });
  }
}
