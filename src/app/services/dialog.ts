/** Service สำหรับจัดการหน้าต่างยืนยัน (Confirmation Dialog) */
import { Injectable, signal } from '@angular/core';

export interface DialogConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export interface DialogData extends DialogConfig {
  id: string;
  resolve: (value: boolean) => void;
}

@Injectable({
  providedIn: 'root'
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
        resolve
      };

      this.activeDialog.set(dialogData);
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
