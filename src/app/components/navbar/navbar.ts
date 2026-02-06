import { Component, HostListener, ElementRef, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SidebarService } from '../sidebar/sidebar';
import { AuthService } from '../../services/auth.service';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  time: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})

export class NavbarComponent {
  isProfileOpen = false;
  isNotificationOpen = false;

  userName = computed(() => this.authService.currentUser() || 'MARK STEPHEN');
  userRole = computed(() => this.authService.userRole() || 'Web Developer');

  notifications: NotificationItem[] = [
    {
      id: 1,
      title: 'รายการรออนุมัติ',
      message: 'รายการ #REQ-2024-001 รอการอนุมัติ',
      status: 'pending',
      time: 'เมื่อสักครู่'
    }
  ];

  constructor(
    private eRef: ElementRef,
    private router: Router,
    public sidebarService: SidebarService,
    private authService: AuthService
  ) { }

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

  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.isProfileOpen = false;
      this.isNotificationOpen = false;
    }
  }

  logout() {
    this.isProfileOpen = false;
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
