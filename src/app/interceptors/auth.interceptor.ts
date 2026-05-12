import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const SKIP_AUTH = new HttpContextToken(() => false);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const raw = localStorage.getItem('allData');
  const allData = raw ? JSON.parse(raw) : null;
  const token = allData?.accessToken || '';

  if (!token) {
    return next(req);
  }

  const clonedReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(clonedReq);
};
