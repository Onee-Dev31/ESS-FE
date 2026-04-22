import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogService } from '../../../services/dialog';

/** ส่วนแสดงหน้าต่างยืนยัน (Confirmation Dialog) สำหรับการทำรายการสำคัญ */
@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-dialog.html',
  styleUrl: './confirmation-dialog.scss'
})
export class ConfirmationDialogComponent {
  dialogService = inject(DialogService);

  confirm() {
    this.dialogService.close(true);
  }

  cancel() {
    this.dialogService.close(false);
  }

  getIcon(type: string): string {
    const icons = {
      danger: 'fa-exclamation-triangle',
      warning: 'fa-exclamation-circle',
      info: 'fa-info-circle'
    };
    return icons[type as keyof typeof icons] || icons.info;
  }

  getIconColor(type: string): string {
    const colors = {
      danger: '#ff3b30',
      warning: '#ff9500',
      info: '#0071e3'
    };
    return colors[type as keyof typeof colors] || colors.info;
  }
}
