import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { delay, Observable, of } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root',
})
export class ApprovalService {
    private baseUrl = environment.api_url;

    constructor(private _http: HttpClient,
        private authservice: AuthService
    ) { }


    //   updateTicket(id: string, formData: FormData): Observable<any> {
    //     // return of({ success: true }).pipe(delay(1500));
    //     return this._http.patch(`${this.baseUrl}/tickets/${id}/approve`, formData);
    //   }

    updateTypeClaims(id: string | number, payload: any): Observable<any> {
        return this._http.patch(`${this.baseUrl}/medical/claims/${id}/review`, payload);
    }
}
