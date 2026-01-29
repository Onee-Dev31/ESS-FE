import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SidebarService } from './sidebar';

interface SubMenuItem {
    label: string;
    path: string;
}

interface MenuItem {
    name: string;
    icon: string;
    subItems: SubMenuItem[];
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
    private router = inject(Router);

    openMenu: string | null = null;

    menuItems: MenuItem[] = [
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
            subItems: [
                { label: 'รายการรออนุมัติ', path: '/approvals' }
            ]
        }
    ];

    toggleMenu(menuName: string) {
        this.openMenu = this.openMenu === menuName ? null : menuName;
    }

    isSubMenuActive(path: string): boolean {
        return this.router.url === path;
    }
}
