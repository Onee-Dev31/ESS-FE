import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { delay, Observable, of } from 'rxjs';

const MOCK_IT_APPROVALS = [
  {
    requestNo: 'REQ-IT-2603-0001',
    createDate: '2026-03-02T10:00:00Z',
    requester: {
      name: 'นาย สมชาย มั่นคง',
      employeeId: 'EMP-001',
      department: 'IT',
      company: 'Onee'
    },
    requestFor: 'นาย สมชาย มั่นคง',
    requestCategory: 'Hardware (ขอเบิกอุปกรณ์)',
    status: 'Pending'
  },
  {
    requestNo: 'REQ-IT-2603-0002',
    createDate: '2026-03-01T15:30:00Z',
    requester: {
      name: 'นางสาว สมหญิง ใจดี',
      employeeId: 'EMP-002',
      department: 'HR',
      company: 'Onee'
    },
    requestFor: 'นางสาว สมหญิง ใจดี',
    requestCategory: 'Software (ขอสิทธิ์เข้าถึงระบบ)',
    status: 'Approved'
  },
  {
    requestNo: 'REQ-IT-2603-0003',
    createDate: '2026-02-28T09:15:00Z',
    requester: {
      name: 'นาย วีระ ทองคำ',
      employeeId: 'EMP-003',
      department: 'Account',
      company: 'Onee'
    },
    requestFor: 'นาย เด็กใหม่ เพิ่งมา',
    requestCategory: 'Network (แจ้งปัญหาเน็ตเวิร์ค)',
    status: 'Rejected'
  },
  {
    requestNo: 'REQ-IT-2603-0004',
    createDate: '2026-03-02T14:20:00Z',
    requester: {
      name: 'นาง สมบูรณ์ พูนสุข',
      employeeId: 'EMP-004',
      department: 'Marketing',
      company: 'Onee'
    },
    requestFor: 'นาง สมบูรณ์ พูนสุข',
    requestCategory: 'Account & Password (ขอรีเซ็ตรหัสผ่าน)',
    status: 'Pending'
  },
  {
    requestNo: 'REQ-IT-2603-0005',
    createDate: '2026-03-02T14:20:00Z',
    requester: {
      name: 'นาย อติวิชญ์ แจ่มใส',
      employeeId: 'EMP-005',
      department: 'Sales',
      company: 'Onee'
    },
    requestFor: 'นาย อติวิชญ์ แจ่มใส',
    requestCategory: 'Hardware (ซ่อมอุปกรณ์)',
    status: 'Referred Back'
  }
];

@Injectable({
  providedIn: 'root',
})
export class ItServiceService {
  private baseUrl = environment.api_url;

  constructor(private _http: HttpClient) { }


  // MASTER
  getSubProblem(): Observable<any> {
    return this._http.get(`${this.baseUrl}/Master/sub-categories`);
  }

  getDeviceCategory(): Observable<any> {
    return this._http.get(`${this.baseUrl}/Master/device-categories`);
  }

  getServiceType(): Observable<any> {
    return this._http.get(`${this.baseUrl}/Master/service-types`);
  }

  getOpenFor(
    { currentEmpId, costCent, companyCode }: {
      currentEmpId?: string;
      costCent?: string;
      companyCode?: string;
    }): Observable<any> {

    let params = new HttpParams();

    if (currentEmpId) {
      params = params.set('currentEmpId', currentEmpId);
    }

    if (costCent) {
      params = params.set('costCent', costCent);
    }

    if (companyCode) {
      params = params.set('companyCode', companyCode);
    }

    return this._http.get(`${this.baseUrl}/Master/open-for`, { params });
  }

  getMyTickets(params: {
    page?: number;
    pageSize?: number;
    requesterAduser?: string;
    requesterCodeempid?: string;
    status?: string;
    priority?: string;
  }): Observable<any> {

    const queryParams: any = {};

    if (params.page) queryParams.page = params.page;
    if (params.pageSize) queryParams.pageSize = params.pageSize;
    if (params.requesterAduser) queryParams.requesterAduser = params.requesterAduser;
    if (params.requesterCodeempid) queryParams.requesterCodeempid = params.requesterCodeempid;
    if (params.status) queryParams.status = params.status;
    if (params.priority) queryParams.priority = params.priority;

    console.log("params >>> ", queryParams)

    return this._http.get<any>(`${this.baseUrl}/tickets/my`, {
      params: queryParams
    });

  }

  getTicketById(ticketId: string) {
    return this._http.get(`${this.baseUrl}/tickets/${ticketId}`);
  }

  createTicket(formData: FormData): Observable<any> {
    // return of({ success: true }).pipe(delay(1500));
    return this._http.post(`${this.baseUrl}/tickets`, formData);
  }

  getApprovalItRequests(): Observable<any> {
    // return this._http.get(`${this.baseUrl}/approval-it-request`);
    return of(MOCK_IT_APPROVALS).pipe(delay(800));
  }

}
