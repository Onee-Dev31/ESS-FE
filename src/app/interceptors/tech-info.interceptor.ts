import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap, finalize } from 'rxjs/operators';
import { TechInfoService } from '../components/shared/tech-info/tech-info.service';

export const techInfoInterceptor: HttpInterceptorFn = (req, next) => {
  const service = inject(TechInfoService);
  const start = Date.now();

  const url = new URL(req.url, window.location.origin);
  const path = url.pathname;

  let status: number | null = null;

  return next(req).pipe(
    tap({
      next: (event: any) => {
        if (event?.status !== undefined) status = event.status;
      },
      error: (err: any) => {
        status = err?.status ?? 0;
      },
    }),
    finalize(() => {
      service.addCall({
        method: req.method,
        path,
        status,
        duration: Date.now() - start,
        timestamp: new Date(),
      });
    }),
  );
};
