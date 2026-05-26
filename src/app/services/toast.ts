/** Service สำหรับแสดงข้อความแจ้งเตือน (Toast) มุมขวาบนของหน้าจอ */
import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  route?: string;
  queryParams?: Record<string, any>;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  toasts = signal<Toast[]>([]);
  private idCounter = 0;

  private show(
    type: Toast['type'],
    message: string,
    duration: number = 3000,
    route?: string,
    queryParams?: Record<string, any>,
  ) {
    const id = `toast-${++this.idCounter}`;
    const toast: Toast = { id, type, message, duration, route, queryParams };

    this.toasts.update((toasts) => [...toasts, toast]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  success(message: string, duration?: number) {
    this.show('success', message, duration);
  }

  error(message: string, duration?: number) {
    this.show('error', message, duration);
  }

  warning(message: string, duration?: number) {
    this.show('warning', message, duration);
  }

  info(message: string, duration?: number, route?: string, queryParams?: Record<string, any>) {
    this.show('info', message, duration, route, queryParams);
  }

  remove(id: string) {
    this.toasts.update((toasts) => toasts.filter((t) => t.id !== id));
  }

  clear() {
    this.toasts.set([]);
  }
}
