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
  token: string = "";
  systemCode: string = "";
  ticketNumber: string = "";
  applicantId: string = "";

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const token = params.get('token') || '';
      this.systemCode = params.get('systemCode') || '';
      this.applicantId = params.get('applicantId') || '';
      this.ticketNumber = this.systemCode === 'ESS-EMAIL-IT-Req'
        ? params.get('ticket') || '' : '';

      this.token = token;

      if (!this.token) {
        this.router.navigateByUrl('/login');
        return;
      }

      this.authService.loginSSO(this.token, this.systemCode).subscribe({
        next: (res) => {
          if (res?.success) {

            console.log("res", res);
            if (res.systmeCode == 'ESS-EMAIL-IT-Req') {
              const url = `${res.landingPath || '/'}?ticket=${encodeURIComponent(this.ticketNumber.trim())}`;
              // console.log('go url:', url);
              this.router.navigateByUrl(url);
            }
            else {
              const url = `${res.landingPath || '/'}?applicantId=${encodeURIComponent(encryptValue(this.applicantId.trim()))}`;
              // console.log('go url:', url);
              this.router.navigateByUrl(url || '/');
            }
          } else {
            this.router.navigateByUrl('/login');
          }
        },
        error: () => {
          this.router.navigateByUrl('/login');
        }
      });
    });
  }
}
