import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { delay, Observable, of } from 'rxjs';

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

  //GET
  // getTickets(params: {
  //   page?: number;
  //   pageSize?: number;
  //   searchText?: string;
  //   status?: string;
  //   priority?: string;
  //   requesterAduser?: string;
  //   assigneeAduser?: string;
  // }): Observable<any> {

  //   const queryParams: any = {};

  //   if (params.page) queryParams.page = params.page;
  //   if (params.pageSize) queryParams.pageSize = params.pageSize;
  //   if (params.searchText) queryParams.searchText = params.searchText;
  //   if (params.status) queryParams.status = params.status;
  //   if (params.priority) queryParams.priority = params.priority;
  //   if (params.requesterAduser) queryParams.requesterAduser = params.requesterAduser;
  //   if (params.assigneeAduser) queryParams.assigneeAduser = params.assigneeAduser;

  //   // console.log("params >>> ", queryParams)

  //   return this._http.get<any>(`${this.baseUrl}/tickets`, {
  //     params: queryParams
  //   });

  // }

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


}
