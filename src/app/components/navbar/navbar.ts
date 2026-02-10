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
}

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

  // Search Logic
  searchQuery = signal('');
  isSearchFocused = signal(false);

  private allSearchMenus: SearchMenuItem[] = [
    { label: 'แดชบอร์ด', path: '/dashboard', category: 'Main', icon: 'fa-home' },
    { label: 'ค่ารักษาพยาบาล (เบิก)', path: '/medicalexpenses', category: 'สวัสดิการ', icon: 'fa-heartbeat' },
    { label: 'เบี้ยเลี้ยง (เบิก)', path: '/allowance', category: 'สวัสดิการ', icon: 'fa-money-bill-wave' },
    { label: 'ค่ารถ / ค่ายานพาหนะ', path: '/vehicle', category: 'สวัสดิการ', icon: 'fa-car' },
    { label: 'ค่าแท็กซี่ (เบิก)', path: '/vehicle-taxi', category: 'สวัสดิการ', icon: 'fa-taxi' },
    { label: 'รายการลา / คำขอลา', path: '/timeoff', category: 'การลา', icon: 'fa-calendar-alt' },
    { label: 'อนุมัติสวัสดิการ', path: '/approvals', category: 'อนุมัติ', icon: 'fa-check-circle' },
    { label: 'อนุมัติค่ารักษาพยาบาล', path: '/approvals-medicalexpenses', category: 'อนุมัติ', icon: 'fa-stethoscope' },
  ];

  filteredSearchResults = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return [];

    return this.allSearchMenus.filter(item =>
      item.label.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    ).slice(0, 5); // Limit to 5 results
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

  onSearchInput(event: any) {
    this.searchQuery.set(event.target.value);
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
    this.clearSearch();
  }

  clearSearch() {
    this.searchQuery.set('');
    this.isSearchFocused.set(false);
  }

  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.isProfileOpen = false;
      this.isNotificationOpen = false;
      this.isSearchFocused.set(false);
    }
  }

  logout() {
    this.isProfileOpen = false;
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
