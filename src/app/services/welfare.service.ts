import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface WelfareEventType {
  id: number;
  code: string;
  name_th: string;
  name_en: string;
  max_amount: number;
  is_cash: boolean;
  relation_scope: string;
  per_occurrence: boolean;
  max_per_year: number | null;
  linked_type_id: number | null;
  is_active: boolean;
}

@Injectable({ providedIn: 'root' })
export class WelfareService {
  private http = inject(HttpClient);
  private baseUrl = environment.api_url;

  getEventTypes(employeeCode: string, fiscalYear?: number): Observable<{ success: boolean; data: WelfareEventType[] }> {
    const params: any = { employee_code: employeeCode };
    if (fiscalYear) params.fiscal_year = fiscalYear;
    return this.http.get<{ success: boolean; data: WelfareEventType[] }>(
      `${this.baseUrl}/welfare/event-types`,
      { params }
    );
  }
}
