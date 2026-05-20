import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { switchMap, catchError, EMPTY, tap, fromEvent, filter } from 'rxjs';
import Swal from 'sweetalert2';

interface VersionInfo {
  version: string;
}

@Injectable({ providedIn: 'root' })
export class VersionCheckService {
  private currentVersion: string | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  start() {
    this.fetchVersion().subscribe();

    // ตรวจทุกครั้งที่ user กลับมาที่ tab
    fromEvent(document, 'visibilitychange')
      .pipe(
        filter(() => document.visibilityState === 'visible'),
        switchMap(() => this.fetchVersion()),
      )
      .subscribe();

    // ตรวจตอน 13:00 และ 18:15 ของทุกวัน 555
    this.scheduleDailyCheck(13, 0);
    this.scheduleDailyCheck(18, 15);
  }

  private scheduleDailyCheck(hour: number, minute: number) {
    const now = new Date();
    const next = new Date();
    next.setHours(hour, minute, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);

    const msUntilNext = next.getTime() - now.getTime();
    setTimeout(() => {
      this.fetchVersion().subscribe();
      setInterval(() => this.fetchVersion().subscribe(), 24 * 60 * 60 * 1000);
    }, msUntilNext);
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
