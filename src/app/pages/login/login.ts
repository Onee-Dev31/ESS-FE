import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
export class LoginComponent {
  private authService = inject(AuthService);
  private loadingService = inject(LoadingService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // loginForm = new FormGroup({
  //   email: new FormControl(localStorage.getItem('rememberedEmail') || '', [Validators.required]),
  //   password: new FormControl('', [Validators.required]),
  //   rememberMe: new FormControl(localStorage.getItem('rememberMe') === 'true')
  // });
  loginForm = new FormGroup({
    username: new FormControl(localStorage.getItem('rememberedEmail') || '', [Validators.required]),
    password: new FormControl('', [Validators.required])
    // rememberMe: new FormControl(localStorage.getItem('rememberMe') === 'true')
  });

  passwordFieldType: string = 'password';
  loginMessage: string = '';
  isError: boolean = false;
  isLoading: boolean = false;

  togglePasswordVisibility() {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { username, password } = this.loginForm.value;

    // console.log('Login request:', { username, password });

    this.authService.login(username || '', password || '').pipe(
      take(1)
    ).subscribe({
      next: (res) => {
        console.log('Login success:', res);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.log('Login error:', err);
      }
    });
  }

  // onLogin() {
  //   if (this.loginForm.invalid) {
  //     this.loginForm.markAllAsTouched();
  //     return;
  //   }

  //   // const { email, password, rememberMe } = this.loginForm.value;
  //   const { email, password } = this.loginForm.value;

  //   // this.authService.login(email || '', password || '', !!rememberMe).pipe(
  //   //   take(1)
  //   // ).subscribe({
  //   //   next: (success) => {
  //   //     if (success) {
  //   //       setTimeout(() => {
  //   //         this.router.navigate(['/dashboard']);
  //   //       }, 500);
  //   //     }
  //   //   }
  //   // });
  // }
}
