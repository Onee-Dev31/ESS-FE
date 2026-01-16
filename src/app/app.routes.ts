import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { LayoutComponent } from './components/layout/layout';
import { VehicleComponent } from './pages/vehicle/vehicle'; 


export const routes: Routes = [
    { path: 'login', component: LoginComponent },

    {
        path: '',
        component: LayoutComponent,
        children: [
            { 
                path: 'dashboard', 
                children: [
                    { path: '', component: DashboardComponent }, 
                    { path: 'default', component: DashboardComponent },
                    { path: 'cms', component: DashboardComponent },     
                    { path: 'e-commerce', component: DashboardComponent }, 
                ]
            },

            // กลับมาใช้แบบบรรทัดเดียวเหมือนเดิม ไม่ต้องมี children
            { path: 'vehicle', component: VehicleComponent },

            { 
                path: '', 
                redirectTo: 'dashboard', 
                pathMatch: 'full' 
            }
        ]
    },

    { path: '**', redirectTo: 'login' }
];