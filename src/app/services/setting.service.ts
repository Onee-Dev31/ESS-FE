import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { delay, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SettingService {
  private baseUrl = environment.api_url;

  constructor(private _http: HttpClient) { }

  getMenu(): Observable<any> {
    return this._http.get(`${this.baseUrl}/Master/all-menus`);
  }

  createMenu(payload: any): Observable<any> {
    return this._http.post(`${this.baseUrl}/Master/menu`, payload);
  }

  updateMenuRolePermission(payload: any): Observable<any> {

    return this._http.post(`${this.baseUrl}/Master/menu-role-permissions`, payload);
  }

  updateMenu(payload: any): Observable<any> {
    return this._http.post(`${this.baseUrl}/Master/update-menu-data`, payload);
  }
}
