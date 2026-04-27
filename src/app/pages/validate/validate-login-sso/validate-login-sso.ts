import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { encryptValue } from '../../../utils/crypto.js ';

@Component({
  selector: 'app-validate-login-sso',
  imports: [],
  templateUrl: './validate-login-sso.html',
  styleUrl: './validate-login-sso.scss',
})
export class ValidateLoginSso {
  token: string = '';
  systemCode: string = '';
  ticketNumber: string = '';
  applicantId: string = '';
  voucherNo: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const token = params.get('token') || '';
      this.systemCode = params.get('systemCode') || '';
      this.applicantId = params.get('applicantId') || '';
      this.ticketNumber = this.systemCode === 'ESS-EMAIL-IT-Req' ? params.get('ticket') || '' : '';
      this.voucherNo =
        this.systemCode === 'ESS-EMAIL-Medical' || this.systemCode === 'ESS-EMAIL-Allowance'
          ? params.get('voucherNo') || ''
          : '';

      this.token = token;

      if (!this.token) {
        this.router.navigateByUrl('/login');
        return;
      }

      this.authService.loginSSO(this.token, this.systemCode).subscribe({
        next: (res) => {
          if (res?.success) {
            if (res.systmeCode == 'ESS-EMAIL-IT-Req') {
              const url = `${res.landingPath || '/'}?ticket=${encodeURIComponent(this.ticketNumber.trim())}`;
              this.router.navigateByUrl(url);
            } else if (
              res.systmeCode == 'ESS-EMAIL-Medical' ||
              res.systmeCode == 'ESS-EMAIL-Allowance'
            ) {
              const fallback =
                res.systmeCode == 'ESS-EMAIL-Allowance'
                  ? '/approvals-allowance'
                  : '/approvals-medical';
              const basePath = res.landingPath || fallback;
              const url = this.voucherNo
                ? `${basePath}?voucherNo=${encodeURIComponent(this.voucherNo.trim())}`
                : basePath;
              this.router.navigateByUrl(url);
            } else if (res.systmeCode == 'ESS-EMAIL-Allowance') {
              const basePath = res.landingPath || '/approvals-allowance';
              const url = this.voucherNo
                ? `${basePath}?voucherNo=${encodeURIComponent(this.voucherNo.trim())}`
                : basePath;
              this.router.navigateByUrl(url);
            } else {
              const url = `${res.landingPath || '/'}?applicantId=${encodeURIComponent(encryptValue(this.applicantId.trim()))}`;
              this.router.navigateByUrl(url || '/');
            }
          } else {
            this.router.navigateByUrl('/login');
          }
        },
        error: () => {
          this.router.navigateByUrl('/login');
        },
      });
    });
  }
}
