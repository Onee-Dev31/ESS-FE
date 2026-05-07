import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./dashboard-it').then((c) => c.DashboardIT),
  },
  {
    path: 'report-detail',
    loadComponent: () => import('./report-detail/report-detail').then((c) => c.ReportDetail),
  },
  {
    path: 'report',
    loadComponent: () => import('./report/report').then((c) => c.Report),
  },
];
export default routes;
