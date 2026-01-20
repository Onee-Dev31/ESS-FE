import { Component, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SidebarService } from '../../services/sidebar';
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
  imports: [CommonModule,RouterLink],
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
    },
    // { 
    //   id: 2, 
    //   title: 'ใบลางานได้รับการอนุมัติ', 
    //   message: 'หัวหน้าอนุมัติการลาพักร้อนของคุณแล้ว', 
    //   status: 'approved', 
    //   time: '2 ชม. ที่แล้ว' 
    // },
    // { 
    //   id: 3, 
    //   title: 'ขอเบิกอุปกรณ์', 
    //   message: 'รายการ #REQ-2024-005 ถูกปฏิเสธ', 
    //   status: 'rejected', 
    //   time: 'เมื่อวานนี้' 
    // },
    // { 
    //   id: 4, 
    //   title: 'สมัครสมาชิกใหม่', 
    //   message: 'นาย สมชาย ใจดี รอการตรวจสอบ', 
    //   status: 'pending', 
    //   time: '2 วันที่แล้ว' 
    // },
    // { 
    //   id: 4, 
    //   title: 'สมัครสมาชิกใหม่', 
    //   message: 'นาย สมชาย ใจดี รอการตรวจสอบ', 
    //   status: 'pending', 
    //   time: '2 วันที่แล้ว' 
    // }
  ];

  constructor(
    private eRef: ElementRef,
    private router: Router,
    public sidebarService: SidebarService
  ) {}

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
    this.router.navigate(['/login']);
  }
}