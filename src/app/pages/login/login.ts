import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading';
import { take, finalize } from 'rxjs/operators';

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

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required])
  });

  passwordFieldType: string = 'password';
  loginMessage: string = '';
  isError: boolean = false;
  isLoading: boolean = false;

  constructor() { }

  togglePasswordVisibility() {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.loadingService.show();
    this.loginMessage = '';
    this.cdr.detectChanges();

    const { email, password } = this.loginForm.value;

    this.authService.login(email || '', password || '').pipe(
      take(1),
      finalize(() => {
        this.isLoading = false;
        this.loadingService.hide();
        this.cdr.detectChanges();
      })
    ).subscribe({
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
        }
      },
      error: () => {
        this.loginMessage = 'An error occurred during login.';
        this.isError = true;
      }
    });
  }
}