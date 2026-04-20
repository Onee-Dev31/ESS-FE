import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { delay, Observable, of } from 'rxjs';
import { AuthService } from './auth.service';

const MOCK_IT_APPROVALS = [
  {
    requestNo: 'REQ-IT-2603-0001',
    ticketTypeId: 1, // แจ้งซ่อม
    createDate: '2026-03-02T10:00:00Z',
    requester: {
      name: 'นาย สมชาย มั่นคง',
      employeeId: 'EMP-001',
      department: 'IT',
      company: 'Onee'
    },
    requestFor: 'นาย สมชาย มั่นคง',
    requestCategory: 'Hardware (ขอเบิกอุปกรณ์)',
    status: 'Pending',
    attachments: [
      { fileName: 'broken-keyboard.jpg', fileSize: 1024 * 500 },
      { fileName: 'form-repair.pdf', fileSize: 1024 * 200 }
    ]
  },
  {
    requestNo: 'REQ-IT-2603-0002',
    ticketTypeId: 3, // ขอใช้บริการ
    createDate: '2026-03-01T15:30:00Z',
    requester: {
      name: 'นางสาว สมหญิง ใจดี',
      employeeId: 'EMP-002',
      department: 'HR',
      company: 'Onee'
    },
    requestFor: 'นางสาว สมหญิง ใจดี',
    requestCategory: 'Software (ขอสิทธิ์เข้าถึงระบบ)',
    status: 'Approved',
    attachments: []
  },
  {
    requestNo: 'REQ-IT-2603-0003',
    ticketTypeId: 2, // แจ้งปัญหา
    createDate: '2026-02-28T09:15:00Z',
    requester: {
      name: 'นาย วีระ ทองคำ',
      employeeId: 'EMP-003',
      department: 'Account',
      company: 'Onee'
    },
    requestFor: 'นาย เด็กใหม่ เพิ่งมา',
    requestCategory: 'Network (แจ้งปัญหาเน็ตเวิร์ค)',
    status: 'Rejected',
    attachments: [
      { fileName: 'error-screen.png', fileSize: 1024 * 150 }
    ]
  },
  {
    requestNo: 'REQ-IT-2603-0004',
    ticketTypeId: 3, // ขอใช้บริการ
    createDate: '2026-03-02T14:20:00Z',
    requester: {
      name: 'นาง สมบูรณ์ พูนสุข',
      employeeId: 'EMP-004',
      department: 'Marketing',
      company: 'Onee'
    },
    requestFor: 'นาง สมบูรณ์ พูนสุข',
    requestCategory: 'Account & Password (ขอรีเซ็ตรหัสผ่าน)',
    status: 'Pending',
    attachments: []
  },
  {
    requestNo: 'REQ-IT-2603-0005',
    ticketTypeId: 1, // แจ้งซ่อม
    createDate: '2026-03-02T14:20:00Z',
    requester: {
      name: 'นาย อติวิชญ์ แจ่มใส',
      employeeId: 'EMP-005',
      department: 'Sales',
      company: 'Onee'
    },
    requestFor: 'นาย อติวิชญ์ แจ่มใส',
    requestCategory: 'Hardware (ซ่อมอุปกรณ์)',
    status: 'Referred Back',
    attachments: [
      { fileName: 'monitor-flicker.mp4', fileSize: 1024 * 1024 * 2 }
    ]
  }
];

@Injectable({
  providedIn: 'root',
})
export class ItServiceService {
  private baseUrl = environment.api_url;
  private ONEEJOB_url = environment.api_ONEEJOB_url;

  constructor(private _http: HttpClient,
    private authservice: AuthService
  ) { }

  getSubProblem(): Observable<any> {
    return this._http.get(`${this.baseUrl}/Master/sub-categories`);
  }

  getDeviceCategory(): Observable<any> {
    return this._http.get(`${this.baseUrl}/Master/device-categories`);
  }

  getServiceType(): Observable<any> {
    return this._http.get(`${this.baseUrl}/Master/service-types`);
  }

  getAssignItDropdown(): Observable<any> {
    return this._http.get(`${this.baseUrl}/Master/assign-dropdown?groupIds=1%2C2%2C3`);
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

  getAllTickets(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    priority?: string;
    searchText?: string;
    requesterAduser?: string;
    ticketTypeId?: string;
    categoryId?: string;
    subCategoryId?: string;
    managerEmpNo?: string;
  }): Observable<any> {

    const queryParams: any = {};

    if (params.page) queryParams.page = params.page;
    if (params.pageSize) queryParams.pageSize = params.pageSize;
    if (params.status) queryParams.status = params.status;
    if (params.priority) queryParams.priority = params.priority;
    if (params.searchText) queryParams.searchText = params.searchText;
    if (params.requesterAduser) queryParams.requesterAduser = params.requesterAduser;
    if (params.ticketTypeId) queryParams.ticketTypeId = params.ticketTypeId;
    if (params.categoryId) queryParams.categoryId = params.categoryId;
    if (params.subCategoryId) queryParams.subCategoryId = params.subCategoryId;
    if (params.managerEmpNo) queryParams.managerEmpNo = params.managerEmpNo;


    console.log("params >>> ", queryParams)

    return this._http.get<any>(`${this.baseUrl}/tickets`, {
      params: queryParams
    });

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

  getApprovalItRequests(params: { page?: number; pageSize?: number; status?: string; empno: string; }): Observable<any> {
    let httpParams = new HttpParams();
    if (params.page) {
      httpParams = httpParams.set('page', params.page);
    }

    if (params.pageSize) {
      httpParams = httpParams.set('pageSize', params.pageSize);
    }

    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    if (params.empno) {
      httpParams = httpParams.set('empno', params.empno);
    }

    return this._http.get<any>(`${this.baseUrl}/it/ticket-all-request`, {
      params: httpParams
    });
  }

  approveTicket(ticketId: number, payload: any) {

    const formData = new FormData();

    Object.keys(payload).forEach(key => {
      const value = payload[key];
      if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    });

    return this._http.patch<any>(
      `${this.baseUrl}/tickets/${ticketId}/approve`,
      formData
    );
  }

  updateAssigneesTicket(assignData: {
    id: any;
    listAssignee?: any;
    acceptby?: any;
    createby: any;
  }): Observable<any> {

    const params = {
      executedBy: assignData.createby,
      ...(assignData.acceptby && { acceptby: assignData.acceptby }),
      ...(assignData.listAssignee && { assignToAdusersJson: assignData.listAssignee })
    }

    // console.log(params)
    return this._http.put(`${this.baseUrl}/tickets/${assignData.id}/assign`, null, { params });
  }

  getTicketByStatus(status: string) {
    return this._http.get(`${this.baseUrl}/tickets/by-status?status=${status}`);
  }

  updateTicket(id: string, formData: FormData): Observable<any> {
    return this._http.patch(`${this.baseUrl}/tickets/${id}/approve`, formData);
  }

  re_open(formData: FormData): Observable<any> {
    return this._http.put<any>(`${this.baseUrl}/tickets/re-open`, formData);
  }

  replyTicket(id: string, formData: FormData): Observable<any> {
    // return of({ success: true }).pipe(delay(1500));
    return this._http.post(`${this.baseUrl}/tickets/${id}/replies`, formData);
  }

  getDetailFromJobsByApplicant(id: string): Observable<any> {
    // return of({ success: true }).pipe(delay(1500));
    const token = this.authservice.allData().accessToken
    return this._http.get(`${this.ONEEJOB_url}/ApplicantNews/applicantByID?applicantId=${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
  }

}
