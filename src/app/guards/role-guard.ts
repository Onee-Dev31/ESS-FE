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
  const allData = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALL_DATA) || '');

  const roles = allData.permission.Role?.split(',').map((r: string) => r.trim()) ?? [];

  const pathExceptions: { grantPath: string; roles: string[]; allowedPaths: string[] }[] = [
    {
      grantPath: 'it-dashboard',
      roles: ['it-staff', 'system-admin'],
      allowedPaths: ['resign-management'],
    },
  ];

  const hasExceptionAccess = pathExceptions.some(
    (ex) =>
      ex.roles.some((r) => roles.includes(r)) &&
      allowedPaths.includes(ex.grantPath) &&
      ex.allowedPaths.includes(currentPath || ''),
  );

  const ssoLandingPath = (localStorage.getItem('landingPath') || '').replace(/^\/+/, '');

  if (allowedPaths.includes(currentPath || '') || hasExceptionAccess || (ssoLandingPath && ssoLandingPath === currentPath)) {
    return true;
  }

  // router.navigate(['/dashboard']);
  const firstPath = allowedPaths[0];
  router.navigate([firstPath ? `/${firstPath}` : '/dashboard']);
  return false;
};
