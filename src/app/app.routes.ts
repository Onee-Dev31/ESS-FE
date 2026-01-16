import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { LayoutComponent } from './components/layout/layout'; 
// import { authGuard } from './guards/auth-guard'; // ไม่ต้อง import ก็ได้ถ้ายังไม่ใช้

export const routes: Routes = [
    { path: 'login', component: LoginComponent },

    {
        path: '',
        component: LayoutComponent,
        // canActivate: [authGuard], // ปิดไว้ถูกแล้วครับสำหรับการเทส
        children: [
            { 
                path: 'dashboard', 
                // เพิ่ม Children เพื่อรองรับ /dashboard/default ตามที่ Sidebar เรียก
                children: [
                    { path: '', component: DashboardComponent }, // /dashboard/default
                    { path: 'cms', component: DashboardComponent },     // /dashboard/cms (ใส่ component เดิมไปก่อนกัน Error)
                    { path: 'e-commerce', component: DashboardComponent }, // /dashboard/e-commerce
                    
                    // ถ้าเข้า /dashboard เฉยๆ ให้เด้งไป default
                    { path: '', redirectTo: 'default', pathMatch: 'full' }
                ]
            },

            // หน้าแรกสุด ให้เด้งเข้า dashboard/default
            { 
                path: '', 
                redirectTo: 'dashboard', 
                pathMatch: 'full' 
            }
        ]
    },

    // ถ้าหาหน้าไหนไม่เจอ ให้เด้งไป login (ตัวการที่ทำให้เด้งเมื่อกี้)
    { path: '**', redirectTo: 'login' }
];