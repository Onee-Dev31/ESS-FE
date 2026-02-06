import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar';
import { Sidebar } from '../sidebar/sidebar.component';
import { SidebarService } from '../sidebar/sidebar';
import { ChildrenOutletContexts } from '@angular/router';
import { fadeSlideAnimation } from '../../animations/animations';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NavbarComponent,
    Sidebar
  ],
  animations: [fadeSlideAnimation],
  templateUrl: './layout.html',
  styleUrls: ['./layout.scss']
})
export class LayoutComponent implements OnInit {
  private lastIsSmallScreen: boolean | null = null;

  constructor(
    public sidebarService: SidebarService,
    private contexts: ChildrenOutletContexts
  ) { }

  getRouteAnimationData() {
    return this.contexts.getContext('primary')?.route?.snapshot?.data?.['animation'];
  }

  ngOnInit(): void {
    this.checkWindowSize();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.checkWindowSize();
  }

  private checkWindowSize(): void {
    const isSmallScreen = window.innerWidth <= 1024;

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
