import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
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



  //it-problem-report
  createTicket(formData: FormData): Observable<any> {
    // return of({ success: true }).pipe(
    //   delay(1500)
    // );
    return this._http.post(`${this.baseUrl}/tickets`, formData);
  }


}
