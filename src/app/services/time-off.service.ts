/** Service สำหรับจัดการข้อมูลคำขอลา (Time Off) */
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  LeaveQuotaData,
  EmployeeLeaveQuota,
  EmployeeLeaveSummary,
  LeaveApprovalRequest,
  LeaveApprovalActionPayload,
  SaveLeaveRequestPayload,
  TimeOffRequest,
  UpsertLeaveQuotaRulePayload,
} from '../interfaces/time-off.interface';

export type {
  EmployeeLeaveQuota,
  EmployeeLeaveSummary,
  LeaveApprovalFile,
  LeaveApprovalAction,
  LeaveApprovalActionPayload,
  LeaveApprovalRequest,
  LeaveQuotaData,
  LeaveQuotaRule,
  LeaveTypeMaster,
  LeaveRequestAction,
  SaveLeaveRequestPayload,
  TimeOffRequest,
  UpsertLeaveQuotaRulePayload,
} from '../interfaces/time-off.interface';

interface LeaveQuotaRulesResponse {
  success?: boolean;
  data: LeaveQuotaData;
}

interface EmployeeLeaveSummaryResponse {
  success?: boolean;
  data?: EmployeeLeaveSummary[];
}

export interface LeaveApprovalCounts {
  pending: number;
  approved: number;
  rejected: number;
  sendback: number;
}

export interface LeaveApprovalsResponse {
  success: boolean;
  data: LeaveApprovalRequest[];
  counts: LeaveApprovalCounts;
}

@Injectable({
  providedIn: 'root',
})
export class TimeOffService {
  readonly latestEmployeeQuotas = signal<EmployeeLeaveQuota[]>([]);
  readonly latestEmployeeShift = signal<{
    startTime: string;
    endTime: string;
    isNightShift: boolean;
  } | null>(null);
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.api_url;

  getQuotaRules(): Observable<LeaveQuotaData> {
    return this.http
      .get<LeaveQuotaRulesResponse>(`${this.baseUrl}/leave/Get-quota-rules`)
      .pipe(map((response) => response.data ?? { master: [], rules: [] }));
  }

  getEmployeeLeaveSummary(employeeCode: string, year?: number): Observable<EmployeeLeaveSummary[]> {
    let params = new HttpParams().set('employee_code', employeeCode.trim());
    if (year !== undefined) params = params.set('year', String(year));

    return this.http
      .get<EmployeeLeaveSummaryResponse>(`${this.baseUrl}/leave/summary-dashboard`, { params })
      .pipe(map((response) => (Array.isArray(response.data) ? response.data : [])));
  }

  upsertQuotaRule(payload: UpsertLeaveQuotaRulePayload): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/leave/Upsert-quota-rules`, payload);
  }

  saveLeaveRequest(payload: SaveLeaveRequestPayload): Observable<unknown> {
    const formData = new FormData();
    formData.append('Action', payload.action ?? 'Upsert');
    formData.append('request_id', String(payload.request_id));

    if (payload.request_by !== undefined) {
      formData.append('request_by', payload.request_by);
    }

    if (payload.action === 'Cancel') {
      return this.http.post(`${this.baseUrl}/leave/LeaveRequests`, formData);
    }

    if (payload.leave_type_id !== undefined) {
      formData.append('leave_type_id', String(payload.leave_type_id));
    }

    if (payload.start_date !== undefined) {
      formData.append('start_date', payload.start_date);
    }

    if (payload.end_date !== undefined) {
      formData.append('end_date', payload.end_date);
    }

    if (payload.total_days !== undefined) {
      formData.append('total_days', String(payload.total_days));
    }

    if (payload.year !== undefined) {
      formData.append('year', String(payload.year));
    }

    if (payload.reason !== undefined) {
      formData.append('reason', payload.reason);
    }

    if (payload.is_half_day !== undefined) {
      formData.append('is_half_day', String(payload.is_half_day));
    }

    if (payload.half_day_period !== undefined) {
      formData.append('half_day_period', payload.half_day_period);
    }

    if (payload.delete_file_ids !== undefined) {
      payload.delete_file_ids.forEach((id) => formData.append('delete_file_ids', String(id)));
    }
    payload.files?.forEach((file) => formData.append('files', file, file.name));
    payload.file_remarks?.forEach((remark) => formData.append('file_remarks', remark));

    return this.http.post(`${this.baseUrl}/leave/LeaveRequests`, formData);
  }

  getLeaveRequests(
    yearFrom: number,
    yearTo: number,
    employeeCode: string,
  ): Observable<TimeOffRequest[]> {
    const params = new HttpParams()
      .set('yearFrom', String(yearFrom))
      .set('yearTo', String(yearTo))
      .set('employee_code', employeeCode);

    return this.http.get<unknown>(`${this.baseUrl}/leave/GetLeaveRequests`, { params }).pipe(
      map((response) => {
        const result = response as {
          data?: unknown[] | { items?: unknown[]; records?: unknown[]; requests?: unknown[] };
          items?: unknown[];
          employee?: Record<string, unknown>;
          quotas?: EmployeeLeaveQuota[];
        };
        const rows = Array.isArray(result)
          ? result
          : Array.isArray(result.data)
            ? result.data
            : result.data && !Array.isArray(result.data)
              ? (result.data.items ?? result.data.records ?? result.data.requests ?? [])
              : (result.items ?? []);
        const quotas = Array.isArray(result.quotas) ? result.quotas : [];
        this.latestEmployeeQuotas.set(quotas);
        this.latestEmployeeShift.set(
          result.employee
            ? {
                startTime: String(result.employee['start_time'] ?? ''),
                endTime: String(result.employee['end_time'] ?? ''),
                isNightShift: Boolean(result.employee['is_night_shift'] ?? false),
              }
            : null,
        );
        return rows.map((row) =>
          this.mapLeaveRequest(row as Record<string, unknown>, result.employee, quotas),
        );
      }),
    );
  }

  getApprovalsListByEmpCode(
    approverCode: string,
    status: string,
    yearFrom: number,
    yearTo: number,
  ): Observable<LeaveApprovalsResponse> {
    const params = new HttpParams()
      .set('approver_code', approverCode.trim())
      .set('status', status)
      .set('yearFrom', String(yearFrom))
      .set('yearTo', String(yearTo));

    return this.http
      .get<LeaveApprovalsResponse>(`${this.baseUrl}/leave/GetApprovalsListByEmpCode`, { params })
      .pipe(
        map((response) => ({
          ...response,
          data: Array.isArray(response.data) ? response.data : [],
          counts: response.counts ?? { pending: 0, approved: 0, rejected: 0, sendback: 0 },
        })),
      );
  }

  approveLeaveRequest(payload: LeaveApprovalActionPayload): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/leave/requests/approve`, payload);
  }

  private mapLeaveRequest(
    row: Record<string, unknown>,
    responseEmployee?: Record<string, unknown>,
    responseQuotas: EmployeeLeaveQuota[] = [],
  ): TimeOffRequest {
    const attachments = (row['attachments'] ?? row['files'] ?? []) as Array<
      Record<string, unknown> | string
    >;
    const employee = (row['employee'] ?? responseEmployee ?? {}) as Record<string, unknown>;
    return {
      id: String(row['leave_number'] ?? row['id'] ?? row['request_id'] ?? ''),
      request_id: Number(row['request_id'] ?? 0),
      leave_number: String(row['leave_number'] ?? ''),
      createDate: String(row['created_at'] ?? row['createDate'] ?? ''),
      create_at: String(row['created_at'] ?? ''),
      status: String(row['status'] ?? row['status_code'] ?? ''),
      employeeId: String(row['employee_code'] ?? row['employeeId'] ?? ''),
      employee_code: String(row['employee_code'] ?? ''),
      leaveType: String(row['leave_name_th'] ?? row['leaveType'] ?? row['leave_type_name'] ?? ''),
      leave_type_id: Number(row['leave_type_id'] ?? 0),
      leaveType_color: String(row['leaveType_color'] ?? row['color_hex'] ?? '').trim() || undefined,
      leaveType_icon: String(row['leaveType_icon'] ?? row['icon_name'] ?? '').trim() || undefined,
      startDate: String(row['start_date'] ?? row['startDate'] ?? ''),
      endDate: String(row['end_date'] ?? row['endDate'] ?? ''),
      reason: String(row['reason'] ?? ''),
      attachments: attachments.map((file) =>
        typeof file === 'string'
          ? { name: file }
          : {
              file_id: Number(file['file_id'] ?? file['id'] ?? 0) || undefined,
              name: String(file['file_name'] ?? file['name'] ?? ''),
              url: String(file['file_path'] ?? file['file_url'] ?? file['url'] ?? ''),
              type: String(file['content_type'] ?? file['file_type'] ?? file['type'] ?? ''),
              remark: String(file['remark'] ?? file['file_remark'] ?? file['description'] ?? ''),
              uploaded_at: String(file['uploaded_at'] ?? file['created_at'] ?? ''),
            },
      ),
      days: Number(row['total_days'] ?? row['days'] ?? 0),
      leavePeriod: String(row['half_day_period'] ?? row['leavePeriod'] ?? 'full-day'),
      shiftStartTime: String(
        employee['start_time'] ?? row['start_time'] ?? row['shiftStartTime'] ?? '',
      ),
      shiftEndTime: String(employee['end_time'] ?? row['end_time'] ?? row['shiftEndTime'] ?? ''),
      isNightShift: Boolean(employee['is_night_shift'] ?? row['is_night_shift'] ?? false),
      employee:
        row['employee'] || responseEmployee
          ? {
              employee_code: String(employee['employee_code'] ?? ''),
              employee_first_name: String(employee['employee_first_name'] ?? ''),
              employee_last_name: String(employee['employee_last_name'] ?? ''),
              employee_nickname: String(employee['employee_nickname'] ?? ''),
              job_grade: String(employee['job_grade'] ?? ''),
              start_work_date: String(employee['start_work_date'] ?? ''),
              service_year: Number(employee['service_year'] ?? 0),
              shift_code: String(employee['shift_code'] ?? ''),
              start_time: String(employee['start_time'] ?? ''),
              end_time: String(employee['end_time'] ?? ''),
              is_night_shift: Boolean(employee['is_night_shift'] ?? false),
            }
          : undefined,
      quotas: responseQuotas,
      approver1_code: String(row['approver1_code'] ?? '') || null,
      approver1_action: String(row['approver1_action'] ?? '') || null,
      approver1_comment: String(row['approver1_comment'] ?? row['approver1_reason'] ?? '') || null,
      approver2_code: String(row['approver2_code'] ?? '') || null,
      approver2_action: String(row['approver2_action'] ?? '') || null,
      approver2_comment: String(row['approver2_comment'] ?? row['approver2_reason'] ?? '') || null,
      overall_status: String(row['overall_status'] ?? row['status'] ?? '') || null,
    };
  }
}
