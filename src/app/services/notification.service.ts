import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NotificationInboxItem {
  notificationRecipientId: number;
  notificationId: number;
  title: string;
  message: string;
  type: string;
  route?: string;
  ticketId?: number;
  ticketNumber?: string;
  isRead: boolean;
  createdAt: string;
}

export interface GetMyNotificationsResponse {
  success: boolean;
  data: NotificationInboxItem[];
  totalRecords: number;
  page: number;
  pageSize: number;
  unreadOnly: boolean;
}

export interface UnreadCountResponse {
  success: boolean;
  unreadCount: number;
}

export interface MarkReadResponse {
  success: boolean;
  message: string;
  affectedRows: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private baseUrl = environment.api_url;

  getMyNotifications(params: {
    recipientCodeempid?: string;
    recipientAduser?: string;
    unreadOnly?: boolean;
    page?: number;
    pageSize?: number;
  }): Observable<GetMyNotificationsResponse> {
    const query: Record<string, string> = {};
    if (params.recipientCodeempid) query['recipientCodeempid'] = params.recipientCodeempid;
    if (params.recipientAduser) query['recipientAduser'] = params.recipientAduser;
    if (params.unreadOnly !== undefined) query['unreadOnly'] = String(params.unreadOnly);
    if (params.page !== undefined) query['page'] = String(params.page);
    if (params.pageSize !== undefined) query['pageSize'] = String(params.pageSize);
    return this.http.get<GetMyNotificationsResponse>(`${this.baseUrl}/notification/my`, {
      params: query,
    });
  }

  getUnreadCount(params: {
    recipientCodeempid?: string;
    recipientAduser?: string;
  }): Observable<UnreadCountResponse> {
    const query: Record<string, string> = {};
    if (params.recipientCodeempid) query['recipientCodeempid'] = params.recipientCodeempid;
    if (params.recipientAduser) query['recipientAduser'] = params.recipientAduser;
    return this.http.get<UnreadCountResponse>(`${this.baseUrl}/notification/unread-count`, {
      params: query,
    });
  }

  markAsRead(body: {
    notificationRecipientId?: number;
    notificationId?: number;
    recipientCodeempid?: string;
    recipientAduser?: string;
  }): Observable<MarkReadResponse> {
    return this.http.post<MarkReadResponse>(`${this.baseUrl}/notification/read`, body);
  }

  markAllAsRead(body: {
    recipientCodeempid?: string;
    recipientAduser?: string;
  }): Observable<MarkReadResponse> {
    return this.http.post<MarkReadResponse>(`${this.baseUrl}/notification/read-all`, body);
  }
}
