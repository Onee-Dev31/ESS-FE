import {
  Component,
  HostListener,
  ElementRef,
  inject,
  computed,
  signal,
  NgZone,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SidebarService } from '../sidebar/sidebar';
import { AuthService } from '../../services/auth.service';
import { USER_ROLES } from '../../constants/user-roles.constant';
import { ToastService } from '../../services/toast';
import { SignalrService } from '../../services/signalr.service';
import { ThemeService } from '../../services/theme.service';
import { ItServiceService } from '../../services/it-service.service';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  time: string;
  route?: string;
  readTicketId?: number;
  ticketNumber?: string;
  ticketId?: number;
  type?: 'note' | 'ticket' | 'assign' | 'status';
}

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
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class NavbarComponent {
  private sidebarService = inject(SidebarService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private eRef = inject(ElementRef);

  // hubConnection!: signalR.HubConnection;
  private zone = inject(NgZone);
  private toastService = inject(ToastService);
  private signalrService = inject(SignalrService);
  private destroyRef = inject(DestroyRef);
  private itService = inject(ItServiceService);
  themeService = inject(ThemeService);
  private notifyAudio = new Audio('/notification1.wav');

  isProfileOpen = false;
  isNotificationOpen = false;

  unreadTicketCount = signal(0);

  private static readonly IT_ROLES = new Set(['it-staff', 'it-director', 'system-admin']);

  userName = computed(() => this.authService.currentUser() || 'MARK STEPHEN');
  userRole = computed(() => this.authService.userRole() || 'Web Developer');
  isItRole = computed(() =>
    (this.authService.userRole() ?? '')
      .split(',')
      .map((r) => r.trim())
      .some((r) => NavbarComponent.IT_ROLES.has(r)),
  );

  userCodeEmp: any = '';

  searchQuery = signal('');
  isSearchFocused = signal(false);
  isMobileSearchOpen = signal(false);

  ngOnInit() {
    this.notifyAudio.volume = 0.7;
    this.signalrService
      .on('NewTicket', '/it-service-list')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        if (!this.isItRole()) return;
        this.zone.run(() => {
          const message = data.message || 'มี Ticket ใหม่เข้ามา';

          const newNoti: NotificationItem = {
            id: Date.now(),
            title: 'แจ้งเตือนใหม่',
            message,
            status: 'pending',
            time: 'เมื่อสักครู่',
            route: '/it-dashboard',
          };

          this.notifications.update((list) => [newNoti, ...list]);
          if (!document.hidden) {
            this.toastService.info(message);

            this.notifyAudio.currentTime = 0;
            this.notifyAudio.play().catch(() => {});
          }
        });
      });

    this.signalrService
      .on('TicketAssigned', '/it-dashboard')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.zone.run(() => {
          const message = data.message || `Ticket ${data.ticket_number ?? ''} ถูก Assign แล้ว`;

          const newNoti: NotificationItem = {
            id: Date.now(),
            title: 'มีการ Assign Ticket',
            message,
            status: 'pending',
            time: 'เมื่อสักครู่',
            route: '/it-dashboard',
            ticketNumber: data.ticket_number ?? undefined,
          };

          this.notifications.update((list) => [newNoti, ...list]);
          if (!document.hidden) {
            this.toastService.info(message);
            this.notifyAudio.currentTime = 0;
            this.notifyAudio.play().catch(() => {});
          }
        });
      });

    this.signalrService
      .on('NewNote')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.zone.run(() => {
          const message = data.message || `มี Chat ใหม่จาก ${data.senderName ?? ''}`;

          const newNoti: NotificationItem = {
            id: Date.now(),
            title: 'มี Chat ใหม่',
            message,
            status: 'pending',
            time: 'เมื่อสักครู่',
            route: this.isItRole() ? '/it-dashboard' : '/it-service-list',
            ticketId: data.ticketId ?? undefined,
            type: 'note',
          };

          this.notifications.update((list) => [newNoti, ...list]);
          if (this.isItRole()) {
            this.fetchUnreadCount();
          } else {
            this.unreadTicketCount.update((n) => n + 1);
          }
          if (!document.hidden) {
            this.toastService.info(message);
            this.notifyAudio.currentTime = 0;
            this.notifyAudio.play().catch(() => {});
          }
        });
      });

    this.userCodeEmp = this.authService.userData().CODEMPID;

    if (this.isItRole()) {
      this.fetchUnreadCount();
      this.fetchUnreadTickets();

      this.signalrService
        .on('NewTicket')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() =>
          this.zone.run(() => {
            this.fetchUnreadCount();
            this.fetchUnreadTickets();
          }),
        );

      this.signalrService
        .on('TicketAssigned')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() =>
          this.zone.run(() => {
            this.fetchUnreadCount();
            this.fetchUnreadTickets();
          }),
        );

      this.signalrService.ticketReadTrigger
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() =>
          this.zone.run(() => {
            this.fetchUnreadCount();
            this.fetchUnreadTickets();
          }),
        );
    } else {
      this.signalrService.ticketReadTrigger
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(({ ticketId }) =>
          this.zone.run(() => {
            this.notifications.update((list) => list.filter((n) => n.ticketId !== ticketId));
            this.unreadTicketCount.update((n) => Math.max(0, n - 1));
          }),
        );
    }
  }

  fetchUnreadCount() {
    const codeempid = this.authService.userData()?.CODEMPID;
    if (!codeempid) return;
    this.itService.getUnreadCount(codeempid, this.authService.userRole() ?? undefined).subscribe({
      next: (res) => this.unreadTicketCount.set(res?.unreadCount ?? 0),
      error: () => this.unreadTicketCount.set(0),
    });
  }

  fetchUnreadTickets() {
    const codeempid = this.authService.userData()?.CODEMPID;
    if (!codeempid) return;
    this.itService.getUnreadTickets(codeempid, this.authService.userRole() ?? undefined).subscribe({
      next: (res: any) => {
        const list: any[] = Array.isArray(res) ? res : (res?.data ?? res?.tickets ?? []);
        const items: NotificationItem[] = list.map((t: any) => ({
          id: t.id ?? t.ticketId,
          title: t.ticket_number ?? t.ticketNumber ?? 'Ticket',
          message: t.subject ?? '',
          status: this.mapTicketStatus(t.user_status ?? t.status),
          time: this.formatRelativeTime(t.created_at ?? t.createDate ?? t.createdAt),
          route: '/it-dashboard',
          readTicketId: t.id ?? t.ticketId,
          ticketId: t.id ?? t.ticketId,
          ticketNumber: t.ticket_number ?? t.ticketNumber,
        }));
        this.notifications.set(items);
      },
      error: (err) => console.error('[Navbar] fetchUnreadTickets error:', err),
    });
  }

  private mapTicketStatus(s: string): 'pending' | 'approved' | 'rejected' {
    if (!s) return 'pending';
    const lower = s.toLowerCase();
    if (lower === 'approved') return 'approved';
    if (lower === 'rejected' || lower === 'referred_back') return 'rejected';
    return 'pending';
  }

  private formatRelativeTime(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'เมื่อสักครู่';
    if (mins < 60) return `${mins} นาทีที่แล้ว`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`;
    return `${Math.floor(hrs / 24)} วันที่แล้ว`;
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

  /** คำนวณรายการค้นหาที่กรองตามตัวอักษรและสิทธิ์ (Role) */
  filteredSearchResults = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return [];

    const currentUserRole = this.authService.userRole();

    return this.allSearchMenus
      .filter((item) => {
        if (item.role) {
          if (Array.isArray(item.role)) {
            if (!item.role.includes(currentUserRole || '')) return false;
          } else {
            if (item.role !== currentUserRole) return false;
          }
        }

        return (
          item.label.toLowerCase().includes(query) || item.category.toLowerCase().includes(query)
        );
      })
      .slice(0, 5);
  });

  notifications = signal<NotificationItem[]>([]);

  // startSignalR() {
  //   this.hubConnection = new signalR.HubConnectionBuilder()
  //     .withUrl('https://localhost:7081/notificationHub')
  //     .withAutomaticReconnect()
  //     .build();

  //   this.hubConnection.start()
  //     .then(() => console.log('🔔 Navbar SignalR Connected'))
  //     .catch(err => console.error(err));

  //   this.hubConnection.on("NewTicket", (data) => {
  //     this.zone.run(() => {
  //       const newNoti: NotificationItem = {
  //         id: Date.now(),
  //         title: 'แจ้งเตือนใหม่',
  //         message: data.message || 'มี Ticket ใหม่เข้ามา',
  //         status: 'pending', // ตรงกับ union type
  //         time: 'เมื่อสักครู่'
  //       };

  //       this.notifications.update(list => [newNoti, ...list]);
  //       this.toastService.info(
  //         data.message || "มี Ticket ใหม่เข้ามา"
  //       );
  //       const audio = new Audio('/notification1.wav');
  //       audio.play().catch(err => console.warn('Audio blocked:', err));
  //       audio.volume = 0.7;
  //       audio.play().catch(() => {});
  //     })
  //   });
  // }

  onNotificationClick(item: NotificationItem) {
    this.isNotificationOpen = false;
    const codeempid = this.authService.userData()?.CODEMPID;
    if (this.isItRole()) {
      if (codeempid && item.readTicketId) {
        this.itService.markTicketRead(item.readTicketId, codeempid).subscribe({
          complete: () => {
            this.fetchUnreadCount();
            this.fetchUnreadTickets();
          },
        });
      }
    } else {
      if (item.ticketId && item.type === 'note') {
        const removed = this.notifications().filter(
          (n) => n.ticketId === item.ticketId && n.type === 'note',
        ).length;
        this.notifications.update((list) =>
          list.filter((n) => !(n.ticketId === item.ticketId && n.type === 'note')),
        );
        this.unreadTicketCount.update((n) => Math.max(0, n - removed));
      } else {
        this.notifications.update((list) => list.filter((n) => n.id !== item.id));
        this.unreadTicketCount.update((n) => Math.max(0, n - 1));
      }
    }
    if (item.route) {
      if (item.ticketNumber) {
        this.signalrService.pendingTicketNumbers.update((s) => new Set([...s, item.ticketNumber!]));
      }
      this.signalrService.refreshTrigger.update((n) => n + 1);
      if (item.ticketId) {
        const alreadyOnPage = this.router.url.startsWith(item.route);
        if (alreadyOnPage) {
          this.signalrService.ticketFocusTrigger.next(item.ticketId);
        } else if (item.route === '/it-dashboard') {
          this.router.navigate([item.route], {
            queryParams: {
              ticketId: item.ticketId,
              focusZone: 'tickets',
              _t: Date.now(),
            },
          });
        } else {
          this.router.navigate([item.route], {
            queryParams: { ticketId: item.ticketId, _t: Date.now() },
          });
        }
        this.clearSearch();
        this.isMobileSearchOpen.set(false);
      } else {
        this.navigateTo(item.route);
      }
    }
  }

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

  /** เปิด/ปิด การค้นหาบนหน้าจอมือถือ */
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

  /** ล้างข้อมูลการเข้าสู่ระบบและกลับไปยังหน้า Login */
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
