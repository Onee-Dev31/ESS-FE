import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertService, AlertState } from '../../../services/alert.service';

@Component({
  selector: 'app-alert-modals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert-modals.html',
  styleUrl: './alert-modals.scss',
})
export class AlertModals {
  private alertService = inject(AlertService);

  // เชื่อมต่อสถานะ Alert จาก Service
  state$ = this.alertService.alertState$;

  /**
   * ปิด Alert เมื่อกดยืนยันหรือพื้นหลัง
   */
  close() {
    this.alertService.hide();
  }

  /**
   * คืนค่าคลาส CSS ตามประเภทของ Alert เพื่อแสดงสีและไอคอนที่ต่างกัน
   */
  getIconClass(type: string): string {
    switch (type) {
      case 'success': return 'fas fa-check-circle text-green';
      case 'error': return 'fas fa-times-circle text-red';
      case 'warning': return 'fas fa-exclamation-triangle text-yellow';
      case 'info': return 'fas fa-info-circle text-blue';
      default: return 'fas fa-info-circle';
    }
  }

  /**
   * คืนค่าคลาส CSS สำหรับปุ่ม
   */
  getBtnClass(type: string): string {
    return `btn-confirm btn-${type}`;
  }
}
