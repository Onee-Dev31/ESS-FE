import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SidebarService } from './sidebar';
import { AuthService } from '../../services/auth.service';
import { USER_ROLES } from '../../constants/user-roles.constant';

interface SubMenuItem {
    label: string;
    path: string;
}

interface MenuItem {
    name: string;
    icon: string;
    subItems: SubMenuItem[];
    role?: string;
}

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './sidebar.html',
    styleUrl: './sidebar.scss'
})
export class Sidebar {
    sidebarService = inject(SidebarService);
    private authService = inject(AuthService);
    private router = inject(Router);

    openMenu: string | null = null;

    private allMenuItems: MenuItem[] = [
        {
            name: 'Dashboard',
            icon: 'fa-home',
            subItems: [
                { label: 'Default', path: '/dashboard/default' }
            ]
        },
        {
            name: 'สวัสดิการ',
            icon: 'fa-gift',
            subItems: [
                { label: 'ค่ารักษาพยาบาล', path: '/medicalexpenses' },
                { label: 'เบี้ยเลี้ยง', path: '/allowance' },
                { label: 'ค่ารถ', path: '/vehicle' },
                { label: 'ค่าแท็กซี่', path: '/vehicle-taxi' }
            ]
        },
        {
            name: 'การลา',
            icon: 'fa-calendar-alt',
            subItems: [
                { label: 'คำขอลา', path: '/timeoff' }
            ]
        },
        {
            name: 'อนุมัติ',
            icon: 'fa-check-circle',
            role: USER_ROLES.ADMIN,
            subItems: [
                { label: 'สวัสดิการ', path: '/approvals' },
                { label: 'ค่ารักษาพยาบาล', path: '/approvals-medicalexpenses' }
            ]
        }
    ];

    menuItems = computed(() => {
        const userRole = this.authService.userRole();
        return this.allMenuItems.filter(item => !item.role || item.role === userRole);
    });

    toggleMenu(menuName: string) {
        this.openMenu = this.openMenu === menuName ? null : menuName;
    }

    isSubMenuActive(path: string): boolean {
        return this.router.url === path;
    }
}
