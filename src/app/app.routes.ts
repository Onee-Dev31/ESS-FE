import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { LayoutComponent } from './components/layout/layout';
import { authGuard } from './guards/auth-guard';
import { roleGuard } from './guards/role-guard';
import { USER_ROLES } from './constants/user-roles.constant';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },

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
                        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent),
                        data: { animation: 'Dashboard' }
                    },
                    {
                        path: 'default',
                        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent)
                    }
                ]
            },

            {
                path: 'vehicle',
                loadComponent: () => import('./pages/vehicle/vehicle').then(m => m.VehicleComponent),
                data: { animation: 'Vehicle' }
            },
            {
                path: 'allowance',
                loadComponent: () => import('./pages/allowance/allowance').then(m => m.AllowanceComponent),
                data: { animation: 'Allowance' }
            },
            {
                path: 'vehicle-taxi',
                loadComponent: () => import('./pages/vehicle-taxi/vehicle-taxi').then(m => m.VehicleTaxiComponent),
                data: { animation: 'VehicleTaxi' }
            },
            {
                path: 'approvals',
                loadComponent: () => import('./pages/approvals/approvals').then(m => m.ApprovalsComponent),
                canActivate: [roleGuard],
                data: { role: [USER_ROLES.ADMIN, USER_ROLES.HR, USER_ROLES.EXECUTIVE, USER_ROLES.SUPERVISOR], category: 'all', animation: 'Approvals' }
            },
            {
                path: 'approvals-medicalexpenses',
                loadComponent: () => import('./pages/approvals/approvals').then(m => m.ApprovalsComponent),
                canActivate: [roleGuard],
                data: { role: [USER_ROLES.ADMIN, USER_ROLES.HR, USER_ROLES.EXECUTIVE, USER_ROLES.SUPERVISOR], category: 'medical', animation: 'ApprovalsMedical' }
            },
            {
                path: 'medicalexpenses',
                loadComponent: () => import('./pages/medicalexpenses/medicalexpenses').then(m => m.MedicalexpensesComponent),
                data: { animation: 'MedicalExpenses' }
            },
            {
                path: 'timeoff',
                loadComponent: () => import('./pages/timeoff/timeoff').then(m => m.TimeoffComponent),
                data: { animation: 'TimeOff' }
            },
            {
                path: 'freelance-management',
                loadComponent: () => import('./pages/freelance-management/freelance-management').then(m => m.FreelanceManagementComponent),
                data: { animation: 'FreelanceManagement' }
            },
            {
                path: 'resign-management',
                loadComponent: () => import('./pages/resign-management/resign-management').then(m => m.ResignManagement),
                data: { animation: 'Dashboard' }
            },
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            }
        ]
    },

    { path: '**', redirectTo: 'login' }
];
