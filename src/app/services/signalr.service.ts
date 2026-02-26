import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { HttpClient, } from '@angular/common/http';
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

    sendTestRealtime() {
        this.http.post(`${this.baseUrl}/notification/it-service`, {})
        .subscribe({
        next: () => console.log('Test sent'),
        error: (err) => console.error(err)
        });
    }

    async startConnection() {
        this.hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(`${this.baseUrl}/notificationHub`)
            .withAutomaticReconnect()
            .build();

        this.hubConnection.onreconnected(async () => {
            console.log("Reconnected");
            await this.joinUserGroups();
        });

        try {
            await this.hubConnection.start();
            console.log("SignalR Connected");
            await this.joinUserGroups();

        } catch (err) {
            console.error("SignalR start error:", err);
        }
    }

    on(eventName: string, route?: string) {
        if (!this.eventMap.has(eventName)) {
            const subject = new Subject<any>();
            this.eventMap.set(eventName, subject);
            this.hubConnection.on(eventName, (data) => {
                this.showBrowserNotification(
                    'แจ้งเตือนใหม่',
                    data.message || 'มีรายการใหม่',
                    route
                );

                subject.next(data);
            });
        }
        return this.eventMap.get(eventName)!.asObservable();
        
    }

    private async joinUserGroups() {

        const roleString = this.authService.userRole();
        if (!roleString) return;

        const roles = roleString
            .split(',')
            .map(r => r.trim())
            .filter(r => r.length > 0);

        for (const role of roles) {
            await this.hubConnection.invoke("JoinGroup", role);
            console.log("Joined group:", role);
        }
    }

    private showBrowserNotification(title: string, message: string, route?: string) {
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;

        if (document.hidden) {

            const notification = new Notification(title, {
                body: message,
                icon: '/ESS.png'
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