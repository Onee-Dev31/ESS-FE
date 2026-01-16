import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { SidebarService } from '../../services/sidebar';
import { filter, Subscription } from 'rxjs';

interface MenuItem {
  name: string;
  icon: string;
  subItems?: { label: string; path: string }[];
}

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

  menuItems: MenuItem[] = [
    {
      name: 'Dashboards',
      icon: 'fa-home',
      subItems: [
        { label: 'Default', path: '/dashboard' },
        { label: 'CMS', path: '/dashboard/cms' },
        { label: 'E-commerce', path: '/dashboard/e-commerce' }
      ]
    },
    { 
      name: 'CMS', 
      icon: 'fa-book', 
      subItems: [
        { label: 'โพสต์ทั้งหมด', path: '/cms/posts' },
        { label: 'เพิ่มเนื้อหาใหม่', path: '/cms/new' }
      ] 
    },
    { 
      name: 'Widgets', 
      icon: 'fa-chart-line', 
      subItems: [
        { label: 'สถิติการใช้งาน', path: '/widgets/stats' },
        { label: 'กราฟภาพรวม', path: '/widgets/charts' }
      ] 
    },
    { 
      name: 'User', 
      icon: 'fa-user', 
      subItems: [
        { label: 'จัดการผู้ใช้งาน', path: '/users/list' },
        { label: 'บทบาทและสิทธิ์', path: '/users/roles' }
      ] 
    },
    { 
      name: 'Tables', 
      icon: 'fa-table', 
      subItems: [
        { label: 'ตารางข้อมูล', path: '/tables/data' }
      ] 
    }
  ];

  constructor(
    public sidebarService: SidebarService,
    public router: Router
  ) {}

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

  toggleMenu(menuName: string) {
    this.openMenu = this.openMenu === menuName ? '' : menuName;
  }
}