import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { LayoutComponent } from './components/layout/layout'; 
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },

    {
        path: '',
        component: LayoutComponent,
        canActivate: [authGuard],
        children: [
            { 
                path: 'dashboard', 
                component: DashboardComponent 
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