import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { STORAGE_KEYS } from '../constants/storage.constants';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = route.data['role'];
  const userRole = authService.getUserRole();

  const isAuthorized = Array.isArray(requiredRoles)
    ? requiredRoles.includes(userRole)
    : userRole === requiredRoles;

  if (isAuthorized) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};

export const menuGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedPaths = authService.getAllowedPaths();
  const currentPath = route.routeConfig?.path;

  if (allowedPaths.includes(currentPath || '')) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
