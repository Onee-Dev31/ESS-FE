import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay, tap } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private http = inject(HttpClient);

    private readonly MOCK_USER = {
        username: 'admin',
        password: '123'
    };

    constructor() { }

    /**
     * [API-Refactor] Login method returning Observable.
     * Replace logic with: return this.http.post<{token: string}>('/api/login', { email, password }).pipe(...);
     */
    login(email: string, password: string): Observable<boolean> {
        const success = email === this.MOCK_USER.username && password === this.MOCK_USER.password;

        return of(success).pipe(
            delay(1000), // Simulate network delay
            tap(isValid => {
                if (isValid) {
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('currentUser', 'Admin User');
                }
            })
        );
    }

    logout() {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('currentUser');
    }
}
