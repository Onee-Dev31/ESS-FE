import { Injectable, inject } from '@angular/core';
import { ToastService } from './toast';

export interface ErrorContext {
  component?: string;
  action?: string;
  data?: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorService {
  private toastService = inject(ToastService);

  handle(error: unknown, context?: ErrorContext): void {
    const message = this.getUserFriendlyMessage(error, context);
    this.toastService.error(message);
    this.logError(error, context);
  }

  private logError(error: unknown, context?: ErrorContext): void {
    console.error('[ErrorService]', {
      error,
      context,
      timestamp: new Date().toISOString()
    });
  }

  private getUserFriendlyMessage(error: unknown, context?: ErrorContext): string {
    const errorWithStatus = error as { status?: number; message?: string };
    if (errorWithStatus?.status === 0 || errorWithStatus?.message?.includes('Http failure')) {
      return 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
    }

    if (errorWithStatus?.status) {
      switch (errorWithStatus.status) {
        case 400:
          return 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง';
        case 401:
          return 'กรุณาเข้าสู่ระบบอีกครั้ง';
        case 403:
          return 'คุณไม่มีสิทธิ์ในการทำรายการนี้';
        case 404:
          return 'ไม่พบข้อมูลที่ต้องการ';
        case 500:
          return 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง';
        default:
          return `เกิดข้อผิดพลาด (${errorWithStatus.status})`;
      }
    }

    if (context?.action?.includes('export')) {
      return 'ไม่สามารถ export ไฟล์ได้ กรุณาลองใหม่อีกครั้ง';
    }

    return errorWithStatus?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
  }

  async handleAsync<T>(
    operation: () => Promise<T>,
    context?: ErrorContext
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.handle(error, context);
      return null;
    }
  }
}
