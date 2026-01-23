import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * ประเภทของ Alert
 */
export type AlertType = 'success' | 'error' | 'warning' | 'info';

/**
 * โครงสร้างข้อมูลของ Alert State
 */
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
    // สถานะเริ่มต้นของ Alert
    private initialState: AlertState = {
        show: false,
        type: 'info',
        title: '',
        message: ''
    };

    private alertSubject = new BehaviorSubject<AlertState>(this.initialState);
    alertState$ = this.alertSubject.asObservable();

    /**
     * แสดง Alert สำเร็จ (Success)
     */
    showSuccess(message: string, title: string = 'สำเร็จ') {
        this.alertSubject.next({ show: true, type: 'success', title, message });
    }

    /**
     * แสดง Alert ข้อผิดพลาด (Error)
     */
    showError(message: string, title: string = 'ข้อผิดพลาด') {
        this.alertSubject.next({ show: true, type: 'error', title, message });
    }

    /**
     * แสดง Alert คำเตือน (Warning)
     */
    showWarning(message: string, title: string = 'คำเตือน') {
        this.alertSubject.next({ show: true, type: 'warning', title, message });
    }

    /**
     * แสดง Alert ข้อมูล (Info)
     */
    showInfo(message: string, title: string = 'แจ้งเตือน') {
        this.alertSubject.next({ show: true, type: 'info', title, message });
    }

    /**
     * ปิดการแสดงผล Alert
     */
    hide() {
        this.alertSubject.next({ ...this.alertSubject.value, show: false });
    }
}
