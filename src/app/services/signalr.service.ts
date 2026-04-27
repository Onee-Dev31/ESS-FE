import { Injectable, inject, signal, effect } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject, throttleTime } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class SignalrService {
  private baseUrl = environment.api_url;
  private http = inject(HttpClient);
  private router = inject(Router);
  private authService = inject(AuthService);
  private hubConnection!: signalR.HubConnection;
  private eventMap = new Map<string, Subject<any>>();
  private eventRoutes = new Map<string, string | undefined>();
  private processedIds = new Set<string>();

  pendingNewTickets = signal(0);
  pendingTicketNumbers = signal<Set<string>>(new Set());
  refreshTrigger = signal(0);
  ticketReadTrigger = new Subject<{ ticketId: any }>();
  ticketStatusTrigger = new Subject<{ ticketId: any; status: string }>();
  ticketFocusTrigger = new Subject<number>();

  constructor() {
    effect(() => {
      const adUser = this.authService.currentUser();
      if (adUser && this.hubConnection?.state === 'Connected') {
        this.joinUserGroups();
      }
    });
  }

  ticketStatusNotify(ticketId: any, requesterAdUser: string, status: string) {
    if (!ticketId || !requesterAdUser) return;
    this.http
      .post(`${this.baseUrl}/notification/ticket-status-notify`, {
        ticketId,
        requesterAdUser,
        status,
      })
      .subscribe({ error: (err) => console.error('ticketStatusNotify error', err) });
  }

  sendTestRealtime() {
    this.http.post(`${this.baseUrl}/notification/it-service`, {}).subscribe({
      next: () => console.log('Test sent'),
      error: (err) => console.error(err),
    });
  }

  assignNotify(ticketId: number, assigneeAdUsers: string[] = []) {
    const senderAdUser = this.authService.currentUser() ?? '';
    return this.http.post(`${this.baseUrl}/notification/it-assign-notify`, {
      ticketId,
      assigneeAdUsers,
      senderAdUser,
    });
  }

  noteNotify(
    ticketId: number,
    requesterAdUser: string,
    senderAdUser: string,
    senderName: string,
    note: string,
  ) {
    this.http
      .post(`${this.baseUrl}/notification/note-notify`, {
        ticketId,
        requesterAdUser,
        senderAdUser,
        senderName,
        note,
      })
      .subscribe({
        next: (res) => console.log('[noteNotify] response:', res),
        error: (err) => console.error('[noteNotify] error:', err),
      });
  }

  sendNewTicketNotification(ticketNumber: string) {
    this.http
      .post(`${this.baseUrl}/notification/it-service/open-tickets`, { ticketNumber })
      .subscribe({
        next: () => console.log('New ticket notification sent'),
        error: (err) => console.error(err),
      });
  }

  async startConnection() {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${this.baseUrl}/notificationHub`)
      .withAutomaticReconnect()
      .build();

    this.hubConnection.onclose((err) => {
      console.warn('[SignalR] connection CLOSED', err ?? '');
    });

    this.hubConnection.onreconnecting((err) => {
      console.warn('[SignalR] RECONNECTING', err ?? '');
    });

    this.hubConnection.onreconnected(async () => {
      await this.joinUserGroups();
    });

    try {
      await this.hubConnection.start();
      console.log('[SignalR] Connected');
      await this.joinUserGroups();
    } catch (err) {
      console.error('[SignalR] start error:', err);
    }
  }

  private static readonly THROTTLE_EVENTS = new Set(['NewTicket', 'TicketAssigned']);

  on(eventName: string, route?: string) {
    if (route) {
      this.eventRoutes.set(eventName, route);
    }

    if (!this.eventMap.has(eventName)) {
      const subject = new Subject<any>();
      this.eventMap.set(eventName, subject);
      this.hubConnection.on(eventName, (data) => {
        if (eventName === 'NewTicket') {
          if (data.messageId && this.processedIds.has(data.messageId)) return;
          if (data.messageId) {
            if (this.processedIds.size >= 500) this.processedIds.clear();
            this.processedIds.add(data.messageId);
          }
          this.pendingNewTickets.update((n) => n + 1);
          if (data.ticketNumber) {
            this.pendingTicketNumbers.update((s) => new Set([...s, data.ticketNumber]));
          }
        }
        this.showBrowserNotification(
          'แจ้งเตือนใหม่',
          data.message || 'มีรายการใหม่',
          this.eventRoutes.get(eventName),
        );
        subject.next(data);
      });
    }
    const obs = this.eventMap.get(eventName)!.asObservable();
    return SignalrService.THROTTLE_EVENTS.has(eventName) ? obs.pipe(throttleTime(500)) : obs;
  }

  private async joinUserGroups() {
    const adUser = this.authService.currentUser();
    if (adUser) {
      await this.hubConnection.invoke('JoinUserGroup', adUser);
      await this.hubConnection.invoke('JoinGroup', `user:${adUser}`);
    }
  }

  private showBrowserNotification(title: string, message: string, route?: string) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    if (document.hidden) {
      const notification = new Notification(title, {
        body: message,
        icon: '/ESS.png',
      });

      notification.onclick = () => {
        window.focus();
        if (route) {
          this.router.navigate([route]);
        }
        notification.close();
      };
    }
  }
}
