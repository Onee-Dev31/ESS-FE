import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  
  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required]), 
    password: new FormControl('', [Validators.required])
  });

  passwordFieldType: string = 'password';
  loginMessage: string = '';
  isError: boolean = false;
  isLoading: boolean = false; 

  private readonly MOCK_USER = {
    username: 'admin',
    password: '123'
  };

  constructor(private router: Router) { }

  togglePasswordVisibility() {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.loginMessage = '';

    setTimeout(() => {
      const { email, password } = this.loginForm.value;

      if (email === this.MOCK_USER.username && password === this.MOCK_USER.password) {
        
        this.loginMessage = 'Login successful!';
        this.isError = false;

        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('currentUser', 'Admin User'); 

        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 500);

      } else {
        this.loginMessage = 'Incorrect username or password.';
        this.isError = true;
        this.isLoading = false;
      }
    }, 1500);
  }
}