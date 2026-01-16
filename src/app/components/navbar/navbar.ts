import { Component, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SidebarService } from '../../services/sidebar';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class NavbarComponent { 
  isDropdownOpen = false;
  userName = 'MARK STEPHEN';
  userRole = 'Web Developer'; 

  constructor(
    private eRef: ElementRef, 
    private router: Router,
    public sidebarService: SidebarService 
  ) {}

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