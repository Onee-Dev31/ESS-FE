import { Component, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SidebarService } from '../sidebar/sidebar';
import { RouterLink } from '@angular/router';

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

  userName = 'MARK STEPHEN';
  userRole = 'Web Developer';

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
    public sidebarService: SidebarService
  ) { }

  // เปิด/ปิด แถบเมนูด้านข้าง
  toggleSidebar() {
    this.sidebarService.toggle();
  }

  // เปิด/ปิด การแจ้งเตือน
  toggleNotification() {
    this.isNotificationOpen = !this.isNotificationOpen;
    if (this.isNotificationOpen) this.isProfileOpen = false;
  }

  // เปิด/ปิด เมนูโปรไฟล์ผู้ใช้งาน
  toggleProfile() {
    this.isProfileOpen = !this.isProfileOpen;
    if (this.isProfileOpen) this.isNotificationOpen = false;
  }

  // ปิดเมนูเมื่อคลิกนอกพื้นที่ Navbar
  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.isProfileOpen = false;
      this.isNotificationOpen = false;
    }
  }

  // ออกจากระบบและกลับไปหน้า Login
  logout() {
    this.isProfileOpen = false;
    this.router.navigate(['/login']);
  }
}