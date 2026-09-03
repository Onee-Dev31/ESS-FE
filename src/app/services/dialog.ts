/** Service สำหรับจัดการหน้าต่างยืนยัน (Confirmation Dialog) */
import { Injectable, signal } from '@angular/core';

export interface DialogConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  showCancel?: boolean;
}

export interface DialogData extends DialogConfig {
  id: string;
  resolve: (value: boolean) => void;
}

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  activeDialog = signal<DialogData | null>(null);
  private idCounter = 0;

  confirm(config: DialogConfig): Promise<boolean> {
    return new Promise((resolve) => {
      const id = `dialog-${++this.idCounter}`;
      const dialogData: DialogData = {
        ...config,
        id,
        confirmText: config.confirmText || 'ยืนยัน',
        cancelText: config.cancelText || 'ยกเลิก',
        type: config.type || 'info',
        showCancel: config.showCancel ?? true,
        resolve,
      };

      this.activeDialog.set(dialogData);
    });
  }

  alert(config: Omit<DialogConfig, 'showCancel'>): Promise<boolean> {
    return this.confirm({
      ...config,
      confirmText: config.confirmText || 'OK',
      showCancel: false,
    });
  }

  close(confirmed: boolean) {
    const dialog = this.activeDialog();
    if (dialog) {
      dialog.resolve(confirmed);
      this.activeDialog.set(null);
    }
  }
}
