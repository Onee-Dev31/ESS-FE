import { Component, inject, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading';
import { take, finalize } from 'rxjs/operators';

/** หน้าเข้าสู่ระบบ (Login Page) สำหรับพนักงานและ Admin */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent implements OnDestroy {
  private authService = inject(AuthService);
  private loadingService = inject(LoadingService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  loginForm = new FormGroup({
    username: new FormControl(localStorage.getItem('rememberedEmail') || '', [Validators.required]),
    password: new FormControl('', [Validators.required])
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

    this.authService.login(username || '', password || '').pipe(
      take(1)
    ).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (returnUrl) {
          this.router.navigateByUrl(returnUrl);
        } else {
          this.router.navigate(['/welcome']);
        }
      },
      error: (err) => {
        console.log('Login error:', err);
      }
    });
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

    this.authService.generateQr().pipe(take(1)).subscribe({
      next: (res) => {
        this.qrImage = res.qrImage;
        this.qrToken = res.qrToken;
        this.qrLoading = false;
        this.startPolling();
        this.cdr.detectChanges();
      },
      error: () => {
        this.qrLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private startPolling() {
    this.pollingTimer = setInterval(() => {
      this.authService.getQrStatus(this.qrToken).pipe(take(1)).subscribe({
        next: (res) => {
          if (res['success'] === true) {
            this.stopPolling();
            this.authService.storeLoginResponse(res);
            this.router.navigate(['/welcome']);
          } else if (res.status === 'expired') {
            this.stopPolling();
            this.qrExpired = true;
            this.cdr.detectChanges();
          }
        }
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
