import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class SignatureService {
  private baseUrl = environment.api_url;

  constructor(private http: HttpClient) {}

  getEmployeeSignature(empCode: string) {
    return this.http.get<any>(`${this.baseUrl}/employee-signature/${empCode}`);
  }

  saveEmployeeSignature(payload: {
    codeEmpId: string;
    base64Signature: string;
    isActive: boolean;
  }) {
    return this.http.post(`${this.baseUrl}/employee-signature`, payload);
  }
}
