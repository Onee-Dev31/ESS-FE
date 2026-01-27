import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required])
  });

  passwordFieldType: string = 'password';
  loginMessage: string = '';
  isError: boolean = false;
  isLoading: boolean = false;

  constructor() { }

  // สลับการซ่อน/แสดงรหัสผ่าน
  togglePasswordVisibility() {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  // จัดการการเข้าสู่ระบบ
  onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.loginMessage = '';
    const { email, password } = this.loginForm.value;


    this.authService.login(email || '', password || '').subscribe({
      next: (success) => {
        if (success) {
          this.loginMessage = 'Login successful!';
          this.isError = false;
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 500);
        } else {
          this.loginMessage = 'Incorrect username or password.';
          this.isError = true;
          this.isLoading = false;
        }
      },
      error: () => {
        this.loginMessage = 'An error occurred.';
        this.isError = true;
        this.isLoading = false;
      }
    });
  }
}