/** Service สำหรับจัดการข้อมูลคำขอลา (Time Off) */
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { LeaveQuotaData, TimeOffRequest } from '../interfaces/time-off.interface';
import { TimeOffMock } from '../mocks/time-off.mock';
import { STORAGE_KEYS } from '../constants/storage.constants';
import { BaseRequestService } from './base-request.service';

export type { LeaveQuotaData, LeaveQuotaRule, LeaveTypeMaster, TimeOffRequest } from '../interfaces/time-off.interface';

interface LeaveQuotaRulesResponse {
  success?: boolean;
  data: LeaveQuotaData;
}

@Injectable({
  providedIn: 'root',
})
export class TimeOffService extends BaseRequestService<TimeOffRequest> {
  protected override readonly STORAGE_KEY = STORAGE_KEYS.MOCK_TIMEOFF_DATA;
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.api_url;

  constructor() {
    super();
    this.initializeData(() => TimeOffMock.generateRequestsByRole(20, 'Admin'));
  }

  getQuotaRules(): Observable<LeaveQuotaData> {
    return this.http
      .get<LeaveQuotaRulesResponse>(`${this.baseUrl}/leave/Get-quota-rules`)
      .pipe(map((response) => response.data ?? { master: [], rules: [] }));
  }
}
