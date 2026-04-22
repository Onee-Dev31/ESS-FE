import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { take } from 'rxjs/operators';

/** หน้ายืนยัน QR Login บนมือถือ */
@Component({
  selector: 'app-qr-confirm',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './qr-confirm.html',
  styleUrl: './qr-confirm.scss',
})
export class QrConfirmComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  qrToken: string = '';
  state: 'confirming' | 'success' | 'error' | 'loading' = 'confirming';
  errorMessage: string = '';
  private isConfirming = false;

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }
    this.qrToken = token;

    if (!this.authService.isLoggedIn()) {
      // ยังไม่ login → ส่งไปหน้า login แล้วพอ login เสร็จจะ redirect กลับมาที่นี่อัตโนมัติ
      const returnUrl = `/qr-confirm?token=${token}`;
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
      return;
    }

    // Login อยู่แล้ว → confirm ทันทีโดยไม่ต้องกดปุ่ม
    this.confirm();
  }

  confirm() {
    if (this.isConfirming) return;
    this.isConfirming = true;
    this.state = 'loading';
    this.cdr.detectChanges();

    this.authService
      .confirmQr(this.qrToken)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.state = 'success';
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isConfirming = false;
          this.state = 'error';
          this.errorMessage = `${err?.error?.message}` || 'ไม่สามารถยืนยันได้ กรุณาลองใหม่';
          const returnUrl = `/qr-confirm?token=${this.qrToken}`;
          this.router.navigate(['/login'], { queryParams: { returnUrl } });
          this.cdr.detectChanges();
        },
      });
  }
}
