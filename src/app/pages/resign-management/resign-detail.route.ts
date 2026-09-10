// import { Routes } from '@angular/router';

// const routes: Routes = [
//   {
//     path: '',
//     loadComponent: () => import('./resign-management').then((c) => c.ResignManagement),
//   },
//   {
//     path: 'detail',
//     loadComponent: () => import('./resign-detail/resign-detail').then((c) => c.ResignDetail),
//   },
//   {
//     path: 'report',
//     loadComponent: () => import('./resign-report/resign-report').then((c) => c.ResignReport),
//   },
// ];
// export default routes;

import { Routes } from '@angular/router';
import { roleGuard } from '../../guards/role-guard';

const itRoles = ['it-staff', 'system-admin'];

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./resign-management').then((c) => c.ResignManagement),
  },

  {
    path: 'detail',
    canActivate: [roleGuard],
    data: {
      role: itRoles,
      fallback: '/resign-management',
    },
    loadComponent: () => import('./resign-detail/resign-detail').then((c) => c.ResignDetail),
  },

  // สำหรับหน้า IT และ Admin
  {
    path: 'detail/report',
    canActivate: [roleGuard],
    data: {
      role: itRoles,
      showAdInfo: true,
      fallback: '/resign-management',
    },
    loadComponent: () => import('./resign-report/resign-report').then((c) => c.ResignReport),
  },

  // สำหรับหน้า Hr
  {
    path: 'report',
    data: {
      showAdInfo: false,
    },
    loadComponent: () => import('./resign-report/resign-report').then((c) => c.ResignReport),
  },
];

export default routes;
