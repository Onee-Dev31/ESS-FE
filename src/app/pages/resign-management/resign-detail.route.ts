import { Routes } from "@angular/router";

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./resign-management').then(c => c.ResignManagement) },
  {
    path: 'detail',
    loadComponent: () => import('./resign-detail/resign-detail').then(c => c.ResignDetail)
  },

];
export default routes;