import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { SidebarService } from '../../services/sidebar';
import { filter, Subscription } from 'rxjs';
import { SIDEBAR_MENU_ITEMS, MenuItem } from '../../config/constants';



@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar implements OnInit, OnDestroy {
  openMenu: string = '';
  private routerSubscription: Subscription | undefined;

  menuItems: MenuItem[] = SIDEBAR_MENU_ITEMS;

  constructor(
    public sidebarService: SidebarService,
    public router: Router
  ) { }

  ngOnInit() {
    this.checkActiveMenu(this.router.url);

    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.checkActiveMenu(event.urlAfterRedirects);
      });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  // ตรวจสอบเมนูที่กำลังใช้งานอยู่ตาม URL เพื่อเปิดกลุ่มเมนูอัตโนมัติ
  checkActiveMenu(url: string) {
    if (url.startsWith('/dashboard')) {
      this.openMenu = 'Dashboards';
      return;
    }

    for (const item of this.menuItems) {
      if (item.subItems) {
        const isMatch = item.subItems.some(sub => url.includes(sub.path));
        if (isMatch) {
          this.openMenu = item.name;
          return;
        }
      }
    }
  }

  // ตรวจสอบว่าเมนูย่อยนั้นๆ กำลังถูกใช้งานอยู่หรือไม่
  isSubMenuActive(path: string): boolean {
    const currentUrl = this.router.url.split('?')[0];
    if ((currentUrl === '/dashboard' || currentUrl === '/dashboard/') && path === '/dashboard/default') {
      return true;
    }

    return this.router.isActive(path, {
      paths: 'exact',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored'
    });
  }

  // สลับการเปิด/ปิดกลุ่มเมนูหลัก
  toggleMenu(menuName: string) {
    this.openMenu = this.openMenu === menuName ? '' : menuName;
  }
}