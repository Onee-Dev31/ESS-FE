import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SidebarService } from './sidebar';
import { AuthService } from '../../services/auth.service';
import { USER_ROLES } from '../../constants/user-roles.constant';
import { MatIconModule } from '@angular/material/icon';

interface SubMenuItem {
    label: string;
    path: string;
}

interface MenuItem {
    name: string;
    icon: string;
    iconType?: string,
    subItems: SubMenuItem[];
    role?: string | string[];
}

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule, RouterLink, MatIconModule],
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
            name: 'Home',
            icon: 'fa-home',
            iconType: 'fa',
            subItems: [
                { label: 'Dashboard', path: '/dashboard' },
                { label: 'Welcome', path: '/welcome' }
            ]
        },
        {
            name: 'สวัสดิการ',
            icon: 'fa-gift',
            iconType: 'fa',
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
            iconType: 'fa',
            subItems: [
                { label: 'คำขอลา', path: '/timeoff' }
            ]
        },
        {
            name: 'อนุมัติ',
            icon: 'fa-check-circle',
            iconType: 'fa',
            role: [USER_ROLES.ADMIN, USER_ROLES.HR, USER_ROLES.EXECUTIVE, USER_ROLES.SUPERVISOR],
            subItems: [
                { label: 'สวัสดิการ', path: '/approvals' },
                { label: 'ค่ารักษาพยาบาล', path: '/approvals-medicalexpenses' }
            ]
        },
        {
            name: 'ตรวจสอบ',
            icon: 'published_with_changes',
            iconType: 'material',
            role: [USER_ROLES.ADMIN, USER_ROLES.HR, USER_ROLES.EXECUTIVE, USER_ROLES.SUPERVISOR],
            subItems: [
                // { label: 'สวัสดิการ', path: '/approvals' },
                // { label: 'ค่ารักษาพยาบาล', path: '/approvals-medicalexpenses' }
            ]
        },
        {
            name: 'IT Service',
            icon: 'fa-desktop',
            iconType: 'fa',
            subItems: [
                { label: 'แจ้งปัญหา/ขออุปกรณ์', path: '/it-request' }
            ]
        },
        // {
        //     name: 'จัดการฟรีแลนซ์',
        //     icon: 'fa-user-tie',
        //     subItems: [
        //         { label: 'รายชื่อฟรีแลนซ์', path: '/freelance-management' }
        //     ]
        // },
        {
            name: 'จัดการพนักงาน',
            icon: 'person',
            // icon: 'fa-person-walking-dashed-line-arrow-right',
            iconType: 'material',
            role: [USER_ROLES.ADMIN, USER_ROLES.HR],
            subItems: [
                { label: 'พนักงานประจำ', path: '/resign-management' },
                { label: 'พนักงานฟรีแลนซ์', path: '/freelance-management' }
            ]
        },
    ];

    menuItems = computed(() => {
        const userRole = this.authService.userRole();
        if (!userRole) return [];

        return this.allMenuItems.filter(item => {
            if (!item.role) return true;
            if (Array.isArray(item.role)) {
                return item.role.includes(userRole);
            }
            return item.role === userRole;
        });
    });

    toggleMenu(menuName: string) {
        this.openMenu = this.openMenu === menuName ? null : menuName;
    }

    isSubMenuActive(path: string): boolean {
        return this.router.url === path;
    }
}
