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
    path?: string | null;
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
                { label: 'ขอรับบริการ IT', path: '/it-service-request' },
                { label: 'แจ้งปัญหาการใช้งาน', path: '/it-problem-report' },
                { label: 'แจ้งซ่อมอุปกรณ์', path: '/it-repair-request' }
            ]
        },
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

        const menusString = localStorage.getItem('allData');
        const menus = menusString ? JSON.parse(menusString).menus : null;

        // console.log(menus, this.allMenuItems);

        const formattedMenus = menus
            .filter((menu: any) => menu.ParentMenuID === null) // หา parent
            .map((parent: any) => {
                return {
                    name: parent.Label,
                    icon: parent.Icon,
                    iconType: parent.Icon && parent.Icon.includes('fa') ? 'fa' : 'material',
                    path: parent.RoutePath && parent.RoutePath.trim() !== '' ? (parent.RoutePath.startsWith('/') ? parent.RoutePath : `/${parent.RoutePath}`) : null,
                    subItems: menus
                        .filter((child: any) => child.ParentMenuID === parent.MenuID)
                        .map((child: any) => ({
                            label: child.Label,
                            path: child.RoutePath ? (child.RoutePath.startsWith('/') ? child.RoutePath : `/${child.RoutePath}`) : ''
                        }))
                        .reduce((acc: any[], current: any) => {
                            const existingIndex = acc.findIndex((t: any) => t.label === current.label);
                            if (existingIndex !== -1) {
                                const existing = acc[existingIndex];
                                if ((!existing.path || existing.path === '/') && current.path && current.path !== '/') {
                                    acc[existingIndex] = current;
                                }
                            } else {
                                acc.push(current);
                            }
                            return acc;
                        }, [])
                        // .sort((a: any, b: any) => {
                        //     const MENU_PRIORITY: Record<string, number> = {
                        //         '/it-problem-report': 1,
                        //         '/it-repair-request': 2,
                        //         '/it-service-request': 3,
                        //     };
                        //     return (MENU_PRIORITY[a.path] ?? 99) - (MENU_PRIORITY[b.path] ?? 99);
                        // })
                };
            });

        // Merge duplicate parent menu names (e.g., if there are two 'IT Request' items)
        const mergedMenus = formattedMenus.reduce((acc: any[], current: any) => {
            const existingMenuIndex = acc.findIndex(item => item.name === current.name);
            if (existingMenuIndex !== -1) {
                const existingMenu = acc[existingMenuIndex];

                // If the existing parent menu lacks a valid path but the current one has it, swap their paths.
                if ((!existingMenu.path || existingMenu.path === '/') && current.path && current.path !== '/') {
                    existingMenu.path = current.path;
                }

                // Merge subItems, preventing duplicates by label priority (keep one with a valid path if multiple)
                current.subItems.forEach((newSub: any) => {
                    const existingSubIndex = existingMenu.subItems.findIndex((sub: any) => sub.label === newSub.label);
                    if (existingSubIndex === -1) {
                        existingMenu.subItems.push(newSub);
                    } else {
                        // If duplicate sub-item exists, prefer the one with a non-empty/non-root path
                        const existingSub = existingMenu.subItems[existingSubIndex];
                        if ((!existingSub.path || existingSub.path === '/') && newSub.path && newSub.path !== '/') {
                            existingMenu.subItems[existingSubIndex] = newSub;
                        }
                    }
                });
            } else {
                acc.push(current);
            }
            return acc;
        }, []);

        return mergedMenus;
    });

    toggleMenu(item: MenuItem) {
        if (item.path) {
            this.router.navigate([item.path]);
        }

        if (this.openMenu === item.name) {
            if (item.name === 'IT Service') return;
            this.openMenu = null;
            return;
        }

        this.openMenu = item.name;
    }


    isSubMenuActive(path: string): boolean {
        return this.router.url === path;
    }
}
