import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AlertService } from '../services/alert.service';

/**
 * Interceptor สำหรับจัดการข้อผิดพลาดในการเรียก API ทั่วทั้งระบบ
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const alertService = inject(AlertService);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            let errorMessage = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';

            if (error.status === 401) {
                errorMessage = 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่';
                // สามารถเพิ่ม logic สำหรับ redirect ไปหน้า login ได้ที่นี่
            } else if (error.status === 403) {
                errorMessage = 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้';
            } else if (error.status === 404) {
                errorMessage = 'ไม่พบข้อมูลที่ต้องการ';
            } else if (error.status === 500) {
                errorMessage = 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ (Internal Server Error)';
            }

            // แสดง Alert แจ้งเตือนผู้ใช้
            alertService.showError(errorMessage);

            return throwError(() => error);
        })
    );
};
