import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./approval-setup').then((c) => c.ApprovalSetup),
  },
  // {
  //   path: 'chain',
  //   loadComponent: () => import('./approval-chain/approval-chain').then((c) => c.ApprovalChain),
  // },
];
export default routes;
