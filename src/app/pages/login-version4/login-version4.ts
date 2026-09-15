import { Component, inject, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading';
import { take, finalize } from 'rxjs/operators';
import { SwalService } from '../../services/swal.service';

@Component({
  selector: 'app-login-version4',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-version4.html',
  styleUrl: './login-version4.scss',
})
export class LoginVersion4 {
  private authService = inject(AuthService);
  private swalService = inject(SwalService);
  private loadingService = inject(LoadingService);
  private router = inject(Router);

  private cdr = inject(ChangeDetectorRef);

  loginForm = new FormGroup({
    username: new FormControl(localStorage.getItem('rememberedEmail') || '', [Validators.required]),
    password: new FormControl('', [Validators.required]),
  });

  passwordFieldType: string = 'password';
  loginMessage: string = '';
  isError: boolean = false;
  isLoading: boolean = false;

  // QR Login state
  showQr: boolean = false;
  qrImage: string = '';
  qrToken: string = '';
  qrLoading: boolean = false;
  qrExpired: boolean = false;
  private pollingTimer: any = null;

  ngOnDestroy() {
    this.stopPolling();
  }

  togglePasswordVisibility() {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { username, password } = this.loginForm.value;

    this.authService
      .login(username || '', password || '')
      .pipe(take(1))
      .subscribe({
        next: async () => {
          const returnUrl = localStorage.getItem('returnUrl');
          localStorage.removeItem('returnUrl');
          const navigated = returnUrl
            ? await this.router.navigateByUrl(returnUrl)
            : await this.router.navigate(['/welcome']);
          if (navigated) {
            await this.warnIfEmployeeEmailMissing();
          }
        },
        error: (err) => {
          console.log('Login error:', err);
        },
      });
  }

  private async warnIfEmployeeEmailMissing(): Promise<void> {
    const email = this.authService.userData()?.EMAIL;
    if (typeof email === 'string' && email.trim()) return;

    await this.swalService.warning(
      'ยังไม่ได้ลงทะเบียนอีเมล',
      'ไม่พบข้อมูลอีเมลของท่านในระบบ ซึ่งอาจทำให้ท่านไม่ได้รับข้อความแจ้งเตือนทางอีเมล กรุณาติดต่อฝ่ายทรัพยากรบุคคล (HR) เพื่อลงทะเบียนอีเมลให้ครบถ้วน',
      undefined,
      {
        confirmButtonText: 'รับทราบ',
        allowOutsideClick: false,
        allowEscapeKey: false,
      },
    );
  }

  switchToQr() {
    this.showQr = true;
    this.loadQr();
  }

  switchToForm() {
    this.showQr = false;
    this.stopPolling();
    this.qrImage = '';
    this.qrToken = '';
    this.qrExpired = false;
  }

  loadQr() {
    this.qrLoading = true;
    this.qrExpired = false;
    this.qrImage = '';
    this.stopPolling();

    this.authService
      .generateQr()
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          this.qrImage = res.qrImage;
          this.qrToken = res.qrToken;
          this.qrLoading = false;
          this.startPolling();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[QR] generateQr error:', err);
          console.error('[QR] error body:', JSON.stringify(err?.error));
          console.error('[QR] status:', err?.status, '| url:', err?.url);
          this.qrLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  private startPolling() {
    this.pollingTimer = setInterval(() => {
      this.authService
        .getQrStatus(this.qrToken)
        .pipe(take(1))
        .subscribe({
          next: async (res) => {
            if (res['success'] === true) {
              this.stopPolling();
              this.authService.storeLoginResponse(res);
              const navigated = await this.router.navigate(['/welcome']);
              if (navigated) {
                await this.warnIfEmployeeEmailMissing();
              }
            } else if (res.status === 'expired') {
              this.stopPolling();
              this.qrExpired = true;
              this.cdr.detectChanges();
            }
          },
        });
    }, 3000);
  }

  private stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }
}
