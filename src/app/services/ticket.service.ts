import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TicketService {
  private http = inject(HttpClient);
  private baseUrl = environment.api_url;

  getTicket(ticketNumber: string) {
    return this.http
      .get(`${this.baseUrl}/auth/detail-ticket/${ticketNumber}`, {
        withCredentials: true,
        responseType: 'text',
      })
      .pipe(map((res) => JSON.parse(res)));
  }

  exportChatHistory(ticketID: string | number): Observable<HttpResponse<Blob>> {
    const params = new HttpParams().set('ticketID', String(ticketID));

    return this.http.get(`${this.baseUrl}/tickets/history/export`, {
      params,
      responseType: 'blob',
      observe: 'response',
    });
  }
}
