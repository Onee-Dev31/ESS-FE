import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApprovalTransportService {
  private _http = inject(HttpClient);
  FILE_BASE = environment.file_base_url;
  private baseUrl = environment.api_url;

  getFileUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${this.FILE_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  getApprovals(approver_aduser: string, voucher_no?: string, status?: string): Observable<any> {
    let p = new HttpParams().set('approver_aduser', approver_aduser);
    if (voucher_no?.trim()) p = p.set('voucher_no', voucher_no.trim());
    if (status?.trim()) p = p.set('status', status.trim());
    return this._http.get<any>(`${this.baseUrl}/transport-claim/approvals`, { params: p });
  }

  getClaimById(claimId: number): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}/transport-claim/claims/${claimId}`);
  }

  updateStatusClaim(claimId: number, body: any): Observable<any> {
    return this._http.patch<any>(
      `${this.baseUrl}/transport-claim/claims/${claimId}/review`,
      body,
    );
  }
}
