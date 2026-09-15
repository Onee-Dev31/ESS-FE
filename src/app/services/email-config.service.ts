import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TestRecipient {
  id: number;
  email: string;
  name: string;
  createBy?: string | null;
}

@Injectable({ providedIn: 'root' })
export class EmailConfigService {
  private _http = inject(HttpClient);
  private baseUrl = `${environment.api_url}/ManageEmailConfig`;
  getMode(): Observable<any> {
    return this._http.post(`${this.baseUrl}/manageEmailConfig`, {
      action: 'GET',
    });
  }
  updateMode(isTestMode: boolean, executeBy: string): Observable<any> {
    return this._http.post(`${this.baseUrl}/manageEmailConfig`, {
      action: 'UPDATE',
      isTestMode,
      executeBy,
    });
  }
  getRecipients(): Observable<any> {
    return this._http.post(`${this.baseUrl}/manageEmailReceive`, { action: 'GET' });
  }
  saveRecipient(recipient: TestRecipient, actor: string, editing: boolean): Observable<any> {
    const body = editing
      ? { action: 'UPDATE', ...recipient, updateby: actor }
      : { action: 'INSERT', ...recipient, id: 0, createBy: actor };
    return this._http.post(`${this.baseUrl}/manageEmailReceive`, body);
  }
  deleteRecipient(id: number, actor: string): Observable<any> {
    return this._http.post(`${this.baseUrl}/manageEmailReceive`, {
      action: 'DELETE',
      id,
      updateby: actor,
    });
  }
}
