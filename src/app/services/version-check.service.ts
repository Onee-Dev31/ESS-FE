import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { catchError, EMPTY, tap, switchMap, filter, fromEvent } from 'rxjs';
import Swal from 'sweetalert2';

interface VersionInfo {
  version: string;
}

@Injectable({ providedIn: 'root' })
export class VersionCheckService {
  private currentVersion: string | null = null;
  private lastCheckedAt: number = Date.now();
  private readonly CHECK_TIMES = ['13:00', '18:15'];

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  start() {
    this.fetchVersion().subscribe();

    (window as any).__checkVersion = () => this.fetchVersion().subscribe();

    setInterval(() => {
      if (this.isCheckTime()) this.fetchVersion().subscribe();
    }, 3000);

    this.router.events
      .pipe(
        filter(
          (e) => e instanceof NavigationEnd && (this.isCheckTime() || this.hasMissedCheckTime()),
        ),
        switchMap(() => this.fetchVersion()),
      )
      .subscribe();

    fromEvent(document, 'visibilitychange')
      .pipe(
        filter(
          () =>
            document.visibilityState === 'visible' &&
            (this.isCheckTime() || this.hasMissedCheckTime()),
        ),
        switchMap(() => this.fetchVersion()),
      )
      .subscribe();
  }

  private isCheckTime(): boolean {
    const now = new Date();
    const hhmm = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    return this.CHECK_TIMES.includes(hhmm);
  }

  private hasMissedCheckTime(): boolean {
    const now = new Date();
    const last = new Date(this.lastCheckedAt);
    return this.CHECK_TIMES.some((hhmm) => {
      const [h, m] = hhmm.split(':').map(Number);
      const checkTime = new Date();
      checkTime.setHours(h, m, 0, 0);
      return checkTime > last && checkTime <= now;
    });
  }
  // private scheduleDailyCheck(hour: number, minute: number) {
  //   const now = new Date();
  //   const next = new Date();
  //   console.log(hour, minute, next.getDate());
  //   next.setHours(hour, minute, 0, 0);
  //   if (next <= now) next.setDate(next.getDate() + 1);

  //   const msUntilNext = next.getTime() - now.getTime();
  //   setTimeout(() => {
  //     this.fetchVersion().subscribe();
  //     setInterval(() => this.fetchVersion().subscribe(), 24 * 60 * 60 * 1000);
  //   }, msUntilNext);
  // }

  private fetchVersion() {
    this.lastCheckedAt = Date.now();
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
