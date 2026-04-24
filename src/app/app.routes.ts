import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { LayoutComponent } from './components/layout/layout';
import { authGuard } from './guards/auth-guard';
import { menuGuard, roleGuard } from './guards/role-guard';
import { USER_ROLES } from './constants/user-roles.constant';
import { ValidateLoginSso } from './pages/validate/validate-login-sso/validate-login-sso';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'validate/loginSSO', component: ValidateLoginSso },
  {
    path: 'qr-confirm',
    loadComponent: () => import('./pages/qr-confirm/qr-confirm').then((m) => m.QrConfirmComponent),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
            data: { animation: 'Dashboard' },
          },
          {
            path: 'default',
            loadComponent: () =>
              import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
          },
        ],
      },
      {
        path: 'it-dashboard',
        loadChildren: () => import('./pages/dashboard-it/it-dasbord.route').then((m) => m.default),
        canActivate: [menuGuard],
        runGuardsAndResolvers: 'pathParamsChange',
        data: { animation: 'Welcome' },
      },
      // {
      //     path: 'it-dashboard',
      //     loadComponent: () => import('./pages/dashboard-it/dashboard-it').then(m => m.DashboardIT),
      //     canActivate: [menuGuard],
      //     data: { animation: 'Welcome' }
      // },
      {
        path: 'welcome',
        loadComponent: () => import('./pages/welcome/welcome').then((m) => m.WelcomeComponent),
        canActivate: [menuGuard],
        data: { animation: 'Welcome' },
      },

      {
        path: 'vehicle',
        loadComponent: () => import('./pages/vehicle/vehicle').then((m) => m.VehicleComponent),
        canActivate: [menuGuard],
        data: { animation: 'Vehicle' },
      },
      {
        path: 'allowance',
        loadComponent: () =>
          import('./pages/allowance/allowance').then((m) => m.AllowanceComponent),
        canActivate: [menuGuard],
        data: { animation: 'Allowance' },
      },
      {
        path: 'vehicle-taxi',
        loadComponent: () =>
          import('./pages/vehicle-taxi/vehicle-taxi').then((m) => m.VehicleTaxiComponent),
        canActivate: [menuGuard],
        data: { animation: 'VehicleTaxi' },
      },
      {
        path: 'approvals',
        loadComponent: () =>
          import('./pages/approvals/approvals').then((m) => m.ApprovalsComponent),
        canActivate: [menuGuard],
        // data: { role: [USER_ROLES.ADMIN, USER_ROLES.HR, USER_ROLES.EXECUTIVE, USER_ROLES.SUPERVISOR], category: 'all', animation: 'Approvals' }
        data: { animation: 'Approvals' },
      },
      {
        path: 'approvals-medicalexpenses',
        loadComponent: () =>
          import('./pages/approvals/approvals').then((m) => m.ApprovalsComponent),
        canActivate: [menuGuard],
        // data: { role: [USER_ROLES.ADMIN, USER_ROLES.HR, USER_ROLES.EXECUTIVE, USER_ROLES.SUPERVISOR], category: 'medical', animation: 'ApprovalsMedical' }
        data: { category: 'medical', animation: 'ApprovalsMedical' },
      },
      {
        path: 'medicalexpenses',
        loadComponent: () =>
          import('./pages/medicalexpenses/medicalexpenses').then((m) => m.MedicalexpensesComponent),
        canActivate: [menuGuard],
        data: { animation: 'MedicalExpenses' },
      },
      {
        path: 'timeoff',
        loadComponent: () => import('./pages/timeoff/timeoff').then((m) => m.TimeoffComponent),
        canActivate: [menuGuard],
        data: { animation: 'TimeOff' },
      },
      {
        path: 'it-problem-report',
        loadComponent: () =>
          import('./pages/it-problem-report/it-problem-report').then(
            (m) => m.ItProblemReportComponent,
          ),
        canActivate: [menuGuard],
        data: { animation: 'ITRequest' },
      },
      {
        path: 'it-repair-request',
        loadComponent: () =>
          import('./pages/it-repair-request/it-repair-request').then(
            (m) => m.ItRepairRequestComponent,
          ),
        canActivate: [menuGuard],
        data: { animation: 'ITRequest' },
      },
      {
        path: 'it-service-request',
        loadComponent: () =>
          import('./pages/it-service-request/it-service-request').then(
            (m) => m.ITServiceRequestComponent,
          ),
        canActivate: [menuGuard],
        data: { animation: 'ITRequest' },
      },
      {
        path: 'freelance-management',
        loadComponent: () =>
          import('./pages/freelance-management/freelance-management').then(
            (m) => m.FreelanceManagementComponent,
          ),
        canActivate: [menuGuard],
        data: { animation: 'FreelanceManagement' },
      },
      {
        path: 'resign-management',
        // loadComponent: () => import('./pages/resign-management/resign-management').then(m => m.ResignManagement),
        loadChildren: () =>
          import('./pages/resign-management/resign-detail.route').then((m) => m.default),
        canActivate: [menuGuard],
        data: { animation: 'Dashboard' },
      },
      {
        path: 'it-service-list',
        loadComponent: () =>
          import('./pages/it-service-list/it-service-list').then((m) => m.ItService),
        canActivate: [menuGuard],
        data: { animation: 'ITRequest' },
      },
      {
        path: 'menu-setting',
        loadComponent: () => import('./pages/setting-menu/setting-menu').then((m) => m.SettingMenu),
        // canActivate: [menuGuard],
        data: { animation: 'Dashboard' },
      },
      {
        path: 'employee-setting',
        loadComponent: () =>
          import('./pages/setting-employee/setting-employee').then((m) => m.SettingEmployee),
        // canActivate: [menuGuard],
        data: { animation: 'Dashboard' },
      },
      {
        path: 'approval-it-request',
        loadComponent: () =>
          import('./pages/approval-it-request/approval-it-request').then(
            (m) => m.ApprovalItRequestComponent,
          ),
        // canActivate: [menuGuard], // Temporarily bypassed for testing
        data: { animation: 'Approvals' },
      },
      {
        path: 'it-request-signature',
        loadComponent: () =>
          import('./pages/it-request-signature/it-request-signature').then(
            (m) => m.ItRequestSignature,
          ),
        data: { animation: 'ITRequest' },
      },
      {
        path: 'save-signature',
        loadComponent: () =>
          import('./pages/save-signature/save-signature').then((m) => m.SaveSignature),
        data: { animation: 'ITRequest' },
      },
      {
        path: 'approval-setup',
        loadComponent: () =>
          import('./pages/approval-setup/approval-setup').then((m) => m.ApprovalSetup),
        // canActivate: [menuGuard],
        data: { animation: 'Dashboard' },
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },

  { path: '**', redirectTo: 'login' },
];
