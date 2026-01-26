import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar';
import { Sidebar } from '../sidebar/sidebar';
import { SidebarService } from '../../services/sidebar';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NavbarComponent,
    Sidebar
  ],
  templateUrl: './layout.html',
  styleUrls: ['./layout.scss']
})
export class LayoutComponent implements OnInit {
  private lastIsSmallScreen: boolean | null = null;

  constructor(public sidebarService: SidebarService) { }

  ngOnInit(): void {
    this.checkWindowSize();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.checkWindowSize();
  }

  private checkWindowSize(): void {
    const isSmallScreen = window.innerWidth <= 1024;

    if (isSmallScreen) {
      // Force collapsed state on screens <= 1024px (disables manual expansion)
      if (!this.sidebarService.isCollapsed()) {
        this.sidebarService.setCollapsed(true);
      }
    } else if (this.lastIsSmallScreen !== isSmallScreen) {
      // Automatically expand ONLY when crossing from small to large screen
      this.sidebarService.setCollapsed(false);
    }

    this.lastIsSmallScreen = isSmallScreen;
  }
}