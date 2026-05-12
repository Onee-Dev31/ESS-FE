import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { map } from 'rxjs/operators';

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
}
