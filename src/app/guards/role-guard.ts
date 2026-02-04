/**
 * @file Role Guard
 * @description Logic for Role Guard
 */

// Section: Imports
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';


// Section: Logic
export const roleGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const requiredRole = route.data['role'] as string;
    const userRole = authService.getUserRole();

    if (userRole === requiredRole) {
        return true;
    }

    router.navigate(['/dashboard']);
    return false;
};
