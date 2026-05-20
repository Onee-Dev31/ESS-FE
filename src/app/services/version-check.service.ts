import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, switchMap, catchError, EMPTY, tap, fromEvent, filter } from 'rxjs';
import Swal from 'sweetalert2';

interface VersionInfo {
  version: string;
}

@Injectable({ providedIn: 'root' })
export class VersionCheckService {
  private http = inject(HttpClient);
  private currentVersion: string | null = null;
  private readonly POLL_INTERVAL_MS = 3000;

  start() {
    this.fetchVersion().subscribe();

    interval(this.POLL_INTERVAL_MS)
      .pipe(switchMap(() => this.fetchVersion()))
      .subscribe();

    fromEvent(document, 'visibilitychange')
      .pipe(
        filter(() => document.visibilityState === 'visible'),
        switchMap(() => this.fetchVersion()),
      )
      .subscribe();
  }

  private fetchVersion() {
    return this.http.get<VersionInfo>(`/version.json?t=${Date.now()}`).pipe(
      tap((data) => {
        if (this.currentVersion === null) {
          this.currentVersion = data.version;
        } else if (this.currentVersion !== data.version) {
          this.currentVersion = data.version;
          this.showUpdateDialog();
        }
      }),
      catchError(() => EMPTY),
    );
  }

  private showUpdateDialog() {
    if (Swal.isVisible()) return;
    Swal.fire({
      icon: 'info',
      title: 'มีการอัปเดตระบบใหม่',
      text: 'กรุณาโหลดหน้าใหม่เพื่อใช้งานเวอร์ชันล่าสุด',
      confirmButtonText: 'โหลดใหม่',
      confirmButtonColor: '#3b82f6',
      allowOutsideClick: false,
      allowEscapeKey: false,
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.reload();
      }
    });
  }
}
