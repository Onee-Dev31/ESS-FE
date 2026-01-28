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

  // ตรวจสอบขนาดหน้าจอเพื่อปรับสถานะ Sidebar อัตโนมัติ (ยุบเมื่อจอเล็กกว่า 1024px)
  private checkWindowSize(): void {
    const isSmallScreen = window.innerWidth <= 1024;

    // หากเป็นครั้งแรกที่รัน (lastIsSmallScreen === null) 
    // และไม่ใช่จอมือถือ (isSmallScreen === false)
    // เราจะไม่สั่งขยาย (setCollapsed(false)) เพื่อให้คงสถานะยุบ (Default Collapsed) ตาม Service
    if (this.lastIsSmallScreen === null) {
      if (isSmallScreen) {
        this.sidebarService.setCollapsed(true);
      }
      this.lastIsSmallScreen = isSmallScreen;
      return;
    }

    if (this.lastIsSmallScreen !== isSmallScreen) {
      this.sidebarService.setCollapsed(isSmallScreen);
      this.lastIsSmallScreen = isSmallScreen;
    }
  }
}