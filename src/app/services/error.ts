import { Injectable, inject } from '@angular/core';
import { ToastService } from './toast';

export interface ErrorContext {
  component?: string;
  action?: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorService {
  private toastService = inject(ToastService);

  /**
   * Handle error with user-friendly message
   */
  handle(error: any, context?: ErrorContext): void {
    const message = this.getUserFriendlyMessage(error, context);
    this.toastService.error(message);
    this.logError(error, context);
  }

  /**
   * Log error to console (can be extended to send to logging service)
   */
  private logError(error: any, context?: ErrorContext): void {
    console.error('[ErrorService]', {
      error,
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Convert error to user-friendly message
   */
  private getUserFriendlyMessage(error: any, context?: ErrorContext): string {
    // Network errors
    if (error?.status === 0 || error?.message?.includes('Http failure')) {
      return 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
    }

    // HTTP errors
    if (error?.status) {
      switch (error.status) {
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
          return `เกิดข้อผิดพลาด (${error.status})`;
      }
    }

    // Export errors
    if (context?.action?.includes('export')) {
      return 'ไม่สามารถ export ไฟล์ได้ กรุณาลองใหม่อีกครั้ง';
    }

    // Generic error
    return error?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
  }

  /**
   * Handle async operation with loading and error handling
   */
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
