import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, Observable, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EmpAdService {
  private baseUrl = 'https://empad.oneeclick.co/';

  constructor(private _http: HttpClient) {}

  getEmployeeManagement(): Observable<any> {
    return this._http.get(`${this.baseUrl}/Employee/EmployeeManagement`);
  }
}
