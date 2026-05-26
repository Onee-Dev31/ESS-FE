import {
  Component,
  HostListener,
  ElementRef,
  inject,
  computed,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SidebarService } from '../sidebar/sidebar';
import { AuthService } from '../../services/auth.service';
import { USER_ROLES } from '../../constants/user-roles.constant';
import { ThemeService } from '../../services/theme.service';
import { NotificationService } from '../../services/notification.service';
import { NotificationInboxItem } from '../../interfaces/notification.interface';
import { EmptyStateComponent } from '../shared/empty-state/empty-state';
import { environment } from '../../../environments/environment';

interface SearchMenuItem {
  label: string;
  path: string;
  category: string;
  icon: string;
  role?: string | string[];
}

/** Component แถบเมนูด้านบน (Navbar) จัดการการค้นหา, รายการแจ้งเตือน และโปรไฟล์ผู้ใช้ */
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, EmptyStateComponent],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class NavbarComponent {
  getEmployeeImage(empCode: string): string {
    return `${environment.employeeImageUrl}/${empCode}.jpg`;
  }

  private sidebarService = inject(SidebarService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private eRef = inject(ElementRef);

  notificationService = inject(NotificationService);
  themeService = inject(ThemeService);

  private notifyAudio = new Audio('/notification1.wav');

  isProfileOpen = false;
  isNotificationOpen = false;
  isBellHighlighted = signal(false);

  searchQuery = signal('');
  isSearchFocused = signal(false);
  isMobileSearchOpen = signal(false);

  @HostListener('window:resize')
  onResize() {
    this.checkScreen();
  }

  isMobile = false;
  checkScreen() {
    const width = window.innerWidth;
    this.isMobile = width <= 620;
  }

  userName = computed(() => {
    const user = this.authService.userData();
    const firstName = user?.NAMFIRSTE || user?.NAMFIRSTT || 'USER';
    const lastName = user?.NAMLASTE || user?.NAMLASTT || '';
    return lastName ? `${firstName} ${lastName[0]}.` : firstName;
  });
  userRole = computed(() => this.authService.userRole() || 'Employee');
  userCodeEmp = computed(() => this.authService.userData()?.CODEMPID || '');
  notificationBadge = computed(() => {
    const count = this.notificationService.unreadCount();
    if (count > 99) return '99+';
    return `${count}`;
  });
  notificationSummary = computed(() => {
    const count = this.notificationService.unreadCount();
    if (count <= 0) return 'Inbox พร้อมใช้งาน';
    if (count === 1) return 'มี 1 รายการที่ยังไม่อ่าน';
    return `มี ${count} รายการที่ยังไม่อ่าน`;
  });

  constructor() {
    this.checkScreen();
    this.notifyAudio.volume = 0.55;

    // Prime audio on first user interaction to satisfy browser autoplay policy
    const primeAudio = () => {
      this.notifyAudio
        .play()
        .then(() => this.notifyAudio.pause())
        .catch(() => {});
      document.removeEventListener('click', primeAudio);
    };
    document.addEventListener('click', primeAudio, { once: true });

    effect(() => {
      const tick = this.notificationService.realtimeTick();
      if (tick <= 0) return;

      this.isBellHighlighted.set(true);
      window.setTimeout(() => this.isBellHighlighted.set(false), 2600);

      if (!document.hidden) {
        this.notifyAudio.currentTime = 0;
        this.notifyAudio.play().catch(() => {});
      }
    });
  }

  private allSearchMenus: SearchMenuItem[] = [
    { label: 'แดชบอร์ด', path: '/dashboard', category: 'Main', icon: 'fa-home' },
    {
      label: 'ค่ารักษาพยาบาล (เบิก)',
      path: '/medicalexpenses',
      category: 'สวัสดิการ',
      icon: 'fa-heartbeat',
    },
    {
      label: 'เบี้ยเลี้ยง (เบิก)',
      path: '/allowance',
      category: 'สวัสดิการ',
      icon: 'fa-money-bill-wave',
    },
    { label: 'ค่ารถ (เบิก)', path: '/vehicle', category: 'สวัสดิการ', icon: 'fa-car' },
    { label: 'ค่าแท็กซี่ (เบิก)', path: '/vehicle-taxi', category: 'สวัสดิการ', icon: 'fa-taxi' },
    { label: 'รายการลา / คำขอลา', path: '/timeoff', category: 'การลา', icon: 'fa-calendar-alt' },
    {
      label: 'อนุมัติสวัสดิการ',
      path: '/approvals',
      category: 'อนุมัติ',
      icon: 'fa-check-circle',
      role: [USER_ROLES.HR, USER_ROLES.EXECUTIVE, USER_ROLES.SUPERVISOR],
    },
    {
      label: 'อนุมัติค่ารักษาพยาบาล',
      path: '/approvals-medicalexpenses',
      category: 'อนุมัติ',
      icon: 'fa-stethoscope',
      role: [USER_ROLES.HR, USER_ROLES.EXECUTIVE, USER_ROLES.SUPERVISOR],
    },
  ];

  filteredSearchResults = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return [];

    const userRoles =
      this.authService
        .userRole()
        ?.split(',')
        .map((r) => r.trim()) ?? [];

    return this.allSearchMenus
      .filter((item) => {
        if (item.role) {
          if (Array.isArray(item.role)) {
            if (!item.role.some((r: string) => userRoles.includes(r))) return false;
          } else if (!userRoles.includes(item.role)) {
            return false;
          }
        }

        return (
          item.label.toLowerCase().includes(query) || item.category.toLowerCase().includes(query)
        );
      })
      .slice(0, 5);
  });

  trackByNotification(_index: number, item: NotificationInboxItem) {
    return `${item.notificationRecipientId ?? item.notificationId ?? item.notificationKey}`;
  }

  formatActorName(item: NotificationInboxItem): string {
    const name = item.actorName ?? '';
    const titles = ['นางสาว', 'น.ส.', 'นาย', 'นาง', 'ด.ช.', 'ด.ญ.', 'Miss.', 'Mrs.', 'Mr.'];
    let clean = name.trim();
    for (const t of titles) {
      if (clean.startsWith(t)) {
        clean = clean.slice(t.length).trim();
        break;
      }
    }
    const firstName = clean.split(' ')[0] || name;
    return item.actorNickname ? `${firstName} (${item.actorNickname})` : firstName;
  }

  toggleSidebar() {
    this.sidebarService.toggle();
  }

  toggleNotification() {
    this.isNotificationOpen = !this.isNotificationOpen;
    if (this.isNotificationOpen) {
      this.isProfileOpen = false;
      this.notificationService.refreshUnreadCount();
      if (this.notificationService.items().length === 0 || this.notificationService.listError()) {
        this.notificationService.loadFirstPage();
      }
    }
  }

  toggleProfile() {
    this.isProfileOpen = !this.isProfileOpen;
    if (this.isProfileOpen) this.isNotificationOpen = false;
  }

  onUnreadOnlyChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.notificationService.setUnreadOnly(input.checked);
  }

  onNotificationClick(item: NotificationInboxItem) {
    this.isNotificationOpen = false;
    this.notificationService.markAsRead(item, () => this.navigateFromNotification(item));
  }

  navigateFromNotification(item: NotificationInboxItem) {
    if (!item.route) return;

    this.router.navigate([item.route], {
      queryParams: item.routeQueryParams ?? undefined,
    });
    this.clearSearch();
    this.isMobileSearchOpen.set(false);
  }

  markAllNotificationsAsRead() {
    this.notificationService.markAllAsRead();
  }

  loadMoreNotifications() {
    this.notificationService.loadMore();
  }

  retryNotificationList() {
    this.notificationService.retryList();
  }

  isNotificationBusy(item: NotificationInboxItem) {
    const key = String(item.notificationRecipientId ?? item.notificationId ?? item.notificationKey);
    return this.notificationService.activeRecipientIds().has(key);
  }

  getNotificationIcon(item: NotificationInboxItem) {
    if (item.notificationType === 'allowance_email') return 'fa-money-bill-wave';

    const typeText = `${item.notificationType} ${item.targetType ?? ''}`.toLowerCase();
    if (typeText.includes('reply') || typeText.includes('note')) return 'fa-comment-dots';
    if (typeText.includes('assign')) return 'fa-user-plus';
    if (typeText.includes('closed')) return 'fa-circle-check';
    if (typeText.includes('rejected')) return 'fa-xmark';
    if (typeText.includes('approved')) return 'fa-check';
    if (typeText.includes('reopen')) return 'fa-rotate-left';
    if (typeText.includes('status')) return 'fa-rotate';
    return 'fa-bell';
  }

  getNotificationAccent(item: NotificationInboxItem) {
    if (!item.isRead) return 'accent-unread';

    if (item.notificationType === 'allowance_email') return 'accent-info';

    const typeText = `${item.notificationType} ${item.targetType ?? ''}`.toLowerCase();
    if (typeText.includes('closed') || typeText.includes('approved')) return 'accent-success';
    if (typeText.includes('reply') || typeText.includes('note')) return 'accent-info';
    return 'accent-muted';
  }

  hasTicketReference(item: NotificationInboxItem) {
    return Boolean(item.ticketId || item.ticketNumber);
  }

  toggleMobileSearch() {
    this.isMobileSearchOpen.update((v) => !v);
    if (!this.isMobileSearchOpen()) {
      this.clearSearch();
    }
  }

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
    this.clearSearch();
    this.isMobileSearchOpen.set(false);
  }

  clearSearch() {
    this.searchQuery.set('');
    this.isSearchFocused.set(false);
  }

  @HostListener('document:click', ['$event'])
  clickout(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!this.eRef.nativeElement.contains(target)) {
      this.isProfileOpen = false;
      this.isNotificationOpen = false;
      this.isSearchFocused.set(false);
    }
  }

  logout() {
    this.isProfileOpen = false;
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (!img.src.includes('user.png')) {
      img.src = 'user.png';
    }
  }
}
