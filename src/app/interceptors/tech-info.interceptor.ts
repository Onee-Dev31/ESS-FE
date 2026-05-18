import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap, finalize } from 'rxjs/operators';
import {
  TechInfoService,
  StoredProcedureInfo,
} from '../components/shared/tech-info/tech-info.service';

export const techInfoInterceptor: HttpInterceptorFn = (req, next) => {
  const service = inject(TechInfoService);
  const start = Date.now();

  const url = new URL(req.url, window.location.origin);
  const path = url.pathname;

  let status: number | null = null;
  let storedProcedures: StoredProcedureInfo[] = [];

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          status = event.status;

          const spHeader = event.headers.get('X-Stored-Procedure');
          if (spHeader) {
            // X-SP-Tables: "sp1:table1|table2,sp2:table3|table4"
            const tablesMap: Record<string, string[]> = {};
            const spTablesHeader = event.headers.get('X-SP-Tables');
            if (spTablesHeader) {
              for (const entry of spTablesHeader.split(',')) {
                const colonIdx = entry.indexOf(':');
                if (colonIdx === -1) continue;
                const spName = entry.slice(0, colonIdx).trim();
                const tables = entry
                  .slice(colonIdx + 1)
                  .split('|')
                  .map((t) => t.trim())
                  .filter(Boolean);
                tablesMap[spName] = tables;
              }
            }

            storedProcedures = spHeader
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
              .map((name) => ({ name, tables: tablesMap[name] ?? [] }));
          }
        }
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
        storedProcedures,
      });
    }),
  );
};
