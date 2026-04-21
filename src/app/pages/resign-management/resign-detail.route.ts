import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./resign-management').then((c) => c.ResignManagement),
  },
  {
    path: 'detail',
    loadComponent: () => import('./resign-detail/resign-detail').then((c) => c.ResignDetail),
  },
  {
    path: 'report',
    loadComponent: () => import('./resign-report/resign-report').then((c) => c.ResignReport),
  },
];
export default routes;
