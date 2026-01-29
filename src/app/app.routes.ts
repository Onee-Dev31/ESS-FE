import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { LayoutComponent } from './components/layout/layout';


export const routes: Routes = [
    { path: 'login', component: LoginComponent },

    {
        path: '',
        component: LayoutComponent,
        children: [
            {
                path: 'dashboard',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent)
                    },
                    {
                        path: 'default',
                        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent)
                    }
                ]
            },


            {
                path: 'vehicle',
                loadComponent: () => import('./pages/vehicle/vehicle').then(m => m.VehicleComponent)
            },
            {
                path: 'allowance',
                loadComponent: () => import('./pages/allowance/allowance').then(m => m.AllowanceComponent)
            },
            {
                path: 'vehicle-taxi',
                loadComponent: () => import('./pages/vehicle-taxi/vehicle-taxi').then(m => m.VehicleTaxiComponent)
            },
            {
                path: 'approvals',
                loadComponent: () => import('./pages/approvals/approvals').then(m => m.ApprovalsComponent)
            },
            {
                path: 'approvals-medicalexpenses',
                loadComponent: () => import('./pages/approvals-medicalexpenses/approvals-medicalexpenses').then(m => m.ApprovalsMedicalexpensesComponent)
            },
            {
                path: 'medicalexpenses',
                loadComponent: () => import('./pages/medicalexpenses/medicalexpenses').then(m => m.MedicalexpensesComponent)
            },
            {
                path: 'timeoff',
                loadComponent: () => import('./pages/timeoff/timeoff').then(m => m.TimeoffComponent)
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
