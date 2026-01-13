import { Component, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SidebarService } from '../../services/sidebar'; // ตรวจสอบว่า path ถูกต้อง

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class NavbarComponent { // แนะนำให้เปลี่ยนเป็น NavbarComponent
  isDropdownOpen = false;
  userName = 'MARK STEPHEN';
  userRole = 'Web Developer'; 

  // เพิ่ม public sidebarService เข้ามาใน constructor
  constructor(
    private eRef: ElementRef, 
    private router: Router,
    public sidebarService: SidebarService 
  ) {}

  // ฟังก์ชันสำหรับกดปุ่ม Hamburger
  toggleSidebar() {
    this.sidebarService.toggle();
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false;
    }
  }

  logout() {
    this.isDropdownOpen = false;
    this.router.navigate(['/login']);
  }
}