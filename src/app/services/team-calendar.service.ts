import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, Observable, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TeamCalendarService {
  private baseUrl = 'https://team-calendar.oneeclick.co:8088/api/Leave/calendar';
  private baseUrlEss = environment.api_url;

  constructor(private _http: HttpClient) {}

  getTeamCalendar(CodeEmpID: string): Observable<any> {
    return this._http.get(`${this.baseUrl}?empId=${CodeEmpID}`);
    // return this._http.get(`${this.baseUrl}?empId=OTV00609`);
  }

  getHoliday(): Observable<any> {
    return this._http.get(`${this.baseUrlEss}/Master/holiday`);
  }

  getHolidayColor(): Observable<any> {
    return this._http.get(`${this.baseUrlEss}/Master/holidayColor`);
  }
}
