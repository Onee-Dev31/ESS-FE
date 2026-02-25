import { Component, HostListener, ElementRef, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SidebarService } from '../sidebar/sidebar';
import { AuthService } from '../../services/auth.service';
import { USER_ROLES } from '../../constants/user-roles.constant';
interface NotificationItem {
  id: number;
  title: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  time: string;
}

interface SearchMenuItem {
  label: string;
  path: string;
  category: string;
  icon: string;
  role?: string | string[];
}

/** Component แถบเมนูด้านบน (Navbar) จัดการการค้นหา, รายการแจ้งเตือน และโปรไฟล์ผู้ใช้ */
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})

export class NavbarComponent {
  private sidebarService = inject(SidebarService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private eRef = inject(ElementRef);

  isProfileOpen = false;
  isNotificationOpen = false;

  userName = computed(() => this.authService.currentUser() || 'MARK STEPHEN');
  userRole = computed(() => this.authService.userRole() || 'Web Developer');


  searchQuery = signal('');
  isSearchFocused = signal(false);
  isMobileSearchOpen = signal(false);

  private allSearchMenus: SearchMenuItem[] = [
    { label: 'แดชบอร์ด', path: '/dashboard', category: 'Main', icon: 'fa-home' },
    { label: 'ค่ารักษาพยาบาล (เบิก)', path: '/medicalexpenses', category: 'สวัสดิการ', icon: 'fa-heartbeat' },
    { label: 'เบี้ยเลี้ยง (เบิก)', path: '/allowance', category: 'สวัสดิการ', icon: 'fa-money-bill-wave' },
    { label: 'ค่ารถ (เบิก)', path: '/vehicle', category: 'สวัสดิการ', icon: 'fa-car' },
    { label: 'ค่าแท็กซี่ (เบิก)', path: '/vehicle-taxi', category: 'สวัสดิการ', icon: 'fa-taxi' },
    { label: 'รายการลา / คำขอลา', path: '/timeoff', category: 'การลา', icon: 'fa-calendar-alt' },
    { label: 'อนุมัติสวัสดิการ', path: '/approvals', category: 'อนุมัติ', icon: 'fa-check-circle', role: [USER_ROLES.HR, USER_ROLES.EXECUTIVE, USER_ROLES.SUPERVISOR] },
    { label: 'อนุมัติค่ารักษาพยาบาล', path: '/approvals-medicalexpenses', category: 'อนุมัติ', icon: 'fa-stethoscope', role: [USER_ROLES.HR, USER_ROLES.EXECUTIVE, USER_ROLES.SUPERVISOR] },
  ];

  /** คำนวณรายการค้นหาที่กรองตามตัวอักษรและสิทธิ์ (Role) */
  filteredSearchResults = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return [];

    const currentUserRole = this.authService.userRole();

    return this.allSearchMenus.filter(item => {

      if (item.role) {
        if (Array.isArray(item.role)) {
          if (!item.role.includes(currentUserRole || '')) return false;
        } else {
          if (item.role !== currentUserRole) return false;
        }
      }


      return item.label.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);
    }).slice(0, 5);
  });

  notifications: NotificationItem[] = [
    {
      id: 1,
      title: 'รายการรออนุมัติ',
      message: 'รายการ #REQ-2024-001 รอการอนุมัติ',
      status: 'pending',
      time: 'เมื่อสักครู่'
    }
  ];

  toggleSidebar() {
    this.sidebarService.toggle();
  }

  toggleNotification() {
    this.isNotificationOpen = !this.isNotificationOpen;
    if (this.isNotificationOpen) this.isProfileOpen = false;
  }

  toggleProfile() {
    this.isProfileOpen = !this.isProfileOpen;
    if (this.isProfileOpen) this.isNotificationOpen = false;
  }

  /** เปิด/ปิด การค้นหาบนหน้าจอมือถือ */
  toggleMobileSearch() {
    this.isMobileSearchOpen.update(v => !v);
    if (!this.isMobileSearchOpen()) {
      this.clearSearch();
    }
  }

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
    this.clearSearch();
    this.isMobileSearchOpen.set(false);
  }

  clearSearch() {
    this.searchQuery.set('');
    this.isSearchFocused.set(false);
  }

  @HostListener('document:click', ['$event'])
  clickout(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!this.eRef.nativeElement.contains(target)) {
      this.isProfileOpen = false;
      this.isNotificationOpen = false;
      this.isSearchFocused.set(false);
    }
  }

  /** ล้างข้อมูลการเข้าสู่ระบบและกลับไปยังหน้า Login */
  logout() {
    this.isProfileOpen = false;
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
