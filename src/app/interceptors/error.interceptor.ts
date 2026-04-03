import { HttpInterceptorFn, HttpErrorResponse, HttpContextToken } from '@angular/common/http';

export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const toastService = inject(ToastService);
    const authService = inject(AuthService);
    const router = inject(Router);

    const skipToast = req.context.get(SKIP_ERROR_TOAST);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            let errorMessage = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
            const isMagicLogin = window.location.search.includes('magic=1');

            if (error.status === 401 && !isMagicLogin && !req.url.includes('/auth/login') && !req.url.includes('/auth/qr/confirm')) {
                errorMessage = 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่';
                authService.logout();
                router.navigate(['/login']);
            } else if (error.status === 401) {
                errorMessage = error.error?.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
            } else if (error.status === 403) {
                errorMessage = 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้';
            } else if (error.status === 404) {
                errorMessage = 'ไม่พบข้อมูลที่ต้องการ';
            } else if (error.status === 500) {
                errorMessage = 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ (Internal Server Error)';
            }

            if (!skipToast) {
                toastService.error(errorMessage);
            }

            return throwError(() => error);
        })
    );
};
