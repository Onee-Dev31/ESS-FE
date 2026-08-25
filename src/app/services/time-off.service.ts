/** Service สำหรับจัดการข้อมูลคำขอลา (Time Off) */
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  LeaveQuotaData,
  LeaveApprovalRequest,
  LeaveApprovalActionPayload,
  SaveLeaveRequestPayload,
  TimeOffRequest,
  UpsertLeaveQuotaRulePayload,
} from '../interfaces/time-off.interface';

export type {
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

interface LeaveApprovalsResponse {
  success: boolean;
  data: LeaveApprovalRequest[];
}

@Injectable({
  providedIn: 'root',
})
export class TimeOffService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.api_url;

  getQuotaRules(): Observable<LeaveQuotaData> {
    return this.http
      .get<LeaveQuotaRulesResponse>(`${this.baseUrl}/leave/Get-quota-rules`)
      .pipe(map((response) => response.data ?? { master: [], rules: [] }));
  }

  upsertQuotaRule(payload: UpsertLeaveQuotaRulePayload): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/leave/Upsert-quota-rules`, payload);
  }

  saveLeaveRequest(payload: SaveLeaveRequestPayload): Observable<unknown> {
    const formData = new FormData();
    formData.append('Action', payload.action ?? 'Upsert');
    formData.append('request_id', String(payload.request_id));
    formData.append('employee_code', payload.employee_code);
    formData.append('leave_type_id', String(payload.leave_type_id));
    formData.append('start_date', payload.start_date);
    formData.append('end_date', payload.end_date);
    formData.append('total_days', String(payload.total_days));
    formData.append('year', String(payload.year));
    formData.append('reason', payload.reason);
    formData.append('is_half_day', String(payload.is_half_day));
    formData.append('half_day_period', payload.half_day_period ?? '');

    const deletedFileIds = Array.isArray(payload.delete_file_ids)
      ? payload.delete_file_ids
      : [payload.delete_file_ids ?? 0];
    deletedFileIds.forEach((id) => formData.append('delete_file_ids', String(id)));
    payload.files?.forEach((file) => formData.append('files', file, file.name));

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
        };
        const rows = Array.isArray(result)
          ? result
          : Array.isArray(result.data)
            ? result.data
            : result.data && !Array.isArray(result.data)
              ? (result.data.items ?? result.data.records ?? result.data.requests ?? [])
              : (result.items ?? []);
        console.log(result.data);
        return rows.map((row) => this.mapLeaveRequest(row as Record<string, unknown>));
      }),
    );
  }

  getApprovalsListByEmpCode(approverCode: string): Observable<LeaveApprovalRequest[]> {
    const params = new HttpParams().set('approver_code', approverCode.trim());

    return this.http
      .get<LeaveApprovalsResponse>(`${this.baseUrl}/leave/GetApprovalsListByEmpCode`, { params })
      .pipe(map((response) => (Array.isArray(response.data) ? response.data : [])));
  }

  approveLeaveRequest(payload: LeaveApprovalActionPayload): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/leave/requests/approve`, payload);
  }

  private mapLeaveRequest(row: Record<string, unknown>): TimeOffRequest {
    const attachments = (row['attachments'] ?? row['files'] ?? []) as Array<
      Record<string, unknown> | string
    >;
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
      startDate: String(row['start_date'] ?? row['startDate'] ?? ''),
      endDate: String(row['end_date'] ?? row['endDate'] ?? ''),
      reason: String(row['reason'] ?? ''),
      attachments: attachments.map((file) =>
        typeof file === 'string'
          ? { name: file }
          : {
              name: String(file['file_name'] ?? file['name'] ?? ''),
              url: String(file['file_url'] ?? file['url'] ?? ''),
            },
      ),
      days: Number(row['total_days'] ?? row['days'] ?? 0),
      leavePeriod: String(row['half_day_period'] ?? row['leavePeriod'] ?? 'full-day'),
      shiftStartTime: String(row['start_time'] ?? row['shiftStartTime'] ?? ''),
      shiftEndTime: String(row['end_time'] ?? row['shiftEndTime'] ?? ''),
    };
  }
}
