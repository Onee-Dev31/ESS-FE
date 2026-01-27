import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

// สถานะของแจ้งเตือน
export interface AlertState {
    show: boolean;
    type: AlertType;
    title: string;
    message: string;
}

@Injectable({
    providedIn: 'root'
})
export class AlertService {
    private initialState: AlertState = {
        show: false,
        type: 'info',
        title: '',
        message: ''
    };

    private alertSubject = new BehaviorSubject<AlertState>(this.initialState);
    alertState$ = this.alertSubject.asObservable();

    // แสดงแจ้งเตือนสำเร็จ
    showSuccess(message: string, title: string = 'สำเร็จ') {
        this.alertSubject.next({ show: true, type: 'success', title, message });
    }

    // แสดงแจ้งเตือนข้อผิดพลาด
    showError(message: string, title: string = 'ข้อผิดพลาด') {
        this.alertSubject.next({ show: true, type: 'error', title, message });
    }

    // แสดงแจ้งเตือนคำเตือน
    showWarning(message: string, title: string = 'คำเตือน') {
        this.alertSubject.next({ show: true, type: 'warning', title, message });
    }

    // แสดงแจ้งเตือนข้อมูล
    showInfo(message: string, title: string = 'แจ้งเตือน') {
        this.alertSubject.next({ show: true, type: 'info', title, message });
    }

    // ซ่อนแจ้งเตือน
    hide() {
        this.alertSubject.next({ ...this.alertSubject.value, show: false });
    }
}

