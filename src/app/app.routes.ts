import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { LayoutComponent } from './components/layout/layout';
import { VehicleComponent } from './pages/vehicle/vehicle';
import { AllowanceComponent } from './pages/allowance/allowance'
import { VehicleTaxiComponent } from './pages/vehicle-taxi/vehicle-taxi'
import { ApprovalsComponent } from './pages/approvals/approvals';


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


            { path: 'vehicle', component: VehicleComponent },
            { path: 'allowance', component: AllowanceComponent },
            { path: 'vehicle-taxi', component: VehicleTaxiComponent },
            { path: 'approvals', component: ApprovalsComponent },

            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            }
        ]
    },

    { path: '**', redirectTo: 'login' }
];