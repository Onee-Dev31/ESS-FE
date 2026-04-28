import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, delay } from 'rxjs';
import { LoadingService } from './loading';
import { ApprovalsHelperService } from './approvals-helper.service';
import {
  MedicalStat,
  LeaveItem,
  HolidayItem,
  AttendanceStat,
  PerformanceItem,
  SpecialDate,
} from '../interfaces/dashboard.interface';
import DateHolidays from 'date-holidays';
import dayjs from 'dayjs';
import { APPROVAL_STATUS, APPROVAL_LABELS } from '../constants/approval.constants';
import { MedicalService } from './medical.service';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private baseUrl = environment.api_url;

  private loadingService = inject(LoadingService);
  private approvalsHelper = inject(ApprovalsHelperService);
  private medicalService = inject(MedicalService);
  private authService = inject(AuthService);

  private readonly PENDING_STATUSES = [
    APPROVAL_STATUS.NEW,
    APPROVAL_STATUS.WAITING_CHECK,
    APPROVAL_STATUS.VERIFIED,
    APPROVAL_STATUS.PENDING_APPROVAL,
    APPROVAL_LABELS.TH.NEW,
    APPROVAL_LABELS.TH.VERIFIED,
    APPROVAL_LABELS.TH.PENDING,
  ];

  constructor(
    private _http: HttpClient,
    private authservice: AuthService,
  ) {}

  private readonly CODE_TYPE_MAP: Record<string, MedicalStat['type']> = {
    OPD: 'outpatient',
    IPD: 'inpatient',
    DENTAL: 'dental',
    VISION: 'optical',
  };

  getMedicalStats(): Observable<MedicalStat[]> {
    const employeeCode = this.authService.userData()?.CODEMPID ?? '';
    const fiscalYear = dayjs().year();

    return this.loadingService.wrap(
      this.medicalService.getExpenseTypesWithBalance(employeeCode, fiscalYear).pipe(
        map((res) =>
          res.data.map((t) => {
            const fmt = (n: number) => n.toLocaleString('th-TH');
            const percent = t.totalLimit > 0 ? Math.round((t.usedAmount / t.totalLimit) * 100) : 0;
            return {
              label: t.nameTh,
              subLabel: `(${fmt(t.totalLimit)}/ปี)`,
              used: fmt(t.usedAmount),
              balance: fmt(t.remainingAmount),
              percent,
              type: this.CODE_TYPE_MAP[t.code.toUpperCase()] ?? 'outpatient',
            } as MedicalStat;
          }),
        ),
      ),
    );
  }

  getLeaveStats(): Observable<LeaveItem[]> {
    const leaves: LeaveItem[] = [
      { label: 'ลาพักร้อน', count: '01/09', type: 'vacation', balance: 8 },
      { label: 'ลากิจ', count: '03/06', type: 'business', balance: 3 },
      { label: 'ลาป่วย', count: '10/30', type: 'sick', balance: 20 },
      { label: 'ลาทำหมัน', count: '03/06', type: 'sterilization', balance: 3 },
      { label: 'ลาเพื่อจัดการงานศพ', count: '03/06', type: 'funeral', balance: 3 },
    ];
    return this.loadingService.wrap(of(leaves).pipe(delay(1000)));
  }

  getHolidays(): Observable<HolidayItem[]> {
    return this.loadingService.wrap(
      of([
        { date: '05/12/2569', name: 'วันคล้ายวันพระบรมราชสมภพ ร.9' },
        { date: '10/12/2569', name: 'วันรัฐธรรมนูญ' },
        { date: '31/12/2569', name: 'วันสิ้นปี' },
      ]).pipe(delay(1000)),
    );
  }

  getAttendanceList(): AttendanceStat[] {
    return [
      { label: 'ลาป่วย', value: '10 วัน' },
      { label: 'ลาพักร้อน', value: '5 วัน' },
      { label: 'ลากิจ', value: '5 วัน' },
      { label: 'มาสาย', value: '5 ครั้ง' },
      { label: 'ขาดงาน', value: '5 ครั้ง' },
    ];
  }

  getPerformanceList(): PerformanceItem[] {
    return [
      { year: 'ปี 2026', grade: 'เกรด A+' },
      { year: 'ปี 2025', grade: 'เกรด A' },
      { year: 'ปี 2024', grade: 'เกรด B+' },
      { year: 'ปี 2023', grade: 'เกรด B' },
      { year: 'ปี 2022', grade: 'เกรด C+' },
      { year: 'ปี 2021', grade: 'เกรด C' },
    ];
  }

  getSpecialDates(): Record<string, SpecialDate> {
    const hd = new DateHolidays('TH');
    hd.setLanguages('th');
    const currentYear = dayjs().year();
    const nextYear = currentYear + 1;
    const holidays = [...hd.getHolidays(currentYear), ...hd.getHolidays(nextYear)];
    const result: Record<string, SpecialDate> = {};
    holidays.forEach((h) => {
      const dateStr = h.date.split(' ')[0];
      if (h.type === 'public') result[dateStr] = { type: 'holiday', note: h.name, code: 'HOL' };
    });
    result['2026-01-20'] = { type: 'leave', note: 'ลาพักร้อน', code: 'VAC' };
    return result;
  }

  // real

  getPerformanceByEmpCode(empCode: string): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/employee-service-info/${empCode}`);
  }

  getLeaveSummaryDashboard(params: { empCode?: any; year?: string }): Observable<any> {
    const queryParams: any = {};

    if (params.empCode) queryParams.employee_code = params.empCode;
    if (params.year) queryParams.year = params.year;

    return this._http.get<any>(`${this.baseUrl}/leave/summary-dashboard`, {
      params: queryParams,
    });
  }
}
