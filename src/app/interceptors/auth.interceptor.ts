import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor สำหรับแนบ Authorization Token ไปกับทุุก Request (ถ้ามี)
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const token = authService.getToken(); // สมมติว่ามีฟังก์ชันนี้ใน AuthService

    // ถ้ามี Token ให้ Clone Request แล้วใส่ Header เข้าไป
    if (token) {
        const cloned = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
        return next(cloned);
    }

    return next(req);
};
