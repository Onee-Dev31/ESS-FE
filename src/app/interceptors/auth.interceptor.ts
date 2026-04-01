import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { STORAGE_KEYS } from '../constants/storage.constants';

export const SKIP_AUTH = new HttpContextToken(() => false);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const raw = localStorage.getItem(STORAGE_KEYS.ALL_DATA);
    const allData = raw ? JSON.parse(raw) : null;
    const token = allData?.accessToken || '';

    if (!token) {
        return next(req);
    }

    const clonedReq = req.clone({
        setHeaders: {
            Authorization: `Bearer ${token}`
        }
    });

    return next(clonedReq);
};
