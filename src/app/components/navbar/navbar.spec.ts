import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NavbarComponent } from './navbar';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

const mockNotificationService = {
  unreadCount: vi.fn(() => 2),
  hasUnread: vi.fn(() => true),
  items: vi.fn(() => []),
  unreadOnly: vi.fn(() => false),
  isListLoading: vi.fn(() => false),
  isLoadingMore: vi.fn(() => false),
  isMarkingAll: vi.fn(() => false),
  listError: vi.fn(() => null),
  isEmpty: vi.fn(() => false),
  hasMore: vi.fn(() => false),
  activeRecipientIds: vi.fn(() => new Set<string>()),
  realtimeTick: vi.fn(() => 0),
  refreshUnreadCount: vi.fn(),
  loadFirstPage: vi.fn(),
  setUnreadOnly: vi.fn(),
  markAsRead: vi.fn((item, onDone?: () => void) => onDone?.()),
  markAllAsRead: vi.fn(),
  loadMore: vi.fn(),
  retryList: vi.fn(),
};

const mockAuthService = {
  currentUser: vi.fn(() => 'tester.one'),
  userRole: vi.fn(() => 'it-staff'),
  userData: vi.fn(() => ({
    CODEMPID: 'EMP001',
    NAMFIRSTE: 'Test',
    NAMLASTE: 'User',
  })),
  logout: vi.fn(),
};

describe('Navbar', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([]),
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opens notification dropdown and refreshes inbox state', () => {
    component.toggleNotification();

    expect(component.isNotificationOpen).toBe(true);
    expect(mockNotificationService.refreshUnreadCount).toHaveBeenCalledTimes(1);
    expect(mockNotificationService.loadFirstPage).toHaveBeenCalledTimes(1);
  });

  it('marks notification as read and navigates to the linked ticket route', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onNotificationClick({
      notificationRecipientId: 10,
      notificationId: 100,
      notificationKey: 'ticket-assigned',
      notificationType: 'ticket_assigned',
      title: 'Assigned',
      message: 'Ticket assigned to you',
      channel: 'inbox',
      ticketId: 55,
      ticketNumber: '#IT-00055',
      actorName: 'Admin',
      actorNickname: null,
      targetType: 'ticket',
      payload: null,
      recipientRole: 'it-staff',
      isRead: false,
      readAt: null,
      createdAt: '2026-05-12T09:00:00Z',
      timeLabel: 'เมื่อสักครู่',
      route: '/it-dashboard',
      routeQueryParams: { ticketId: 55, focusZone: 'tickets' },
      raw: {},
    });

    expect(mockNotificationService.markAsRead).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(['/it-dashboard'], {
      queryParams: { ticketId: 55, focusZone: 'tickets' },
    });
  });

  it('toggles unread-only filter through the notification service', () => {
    const event = {
      target: { checked: true },
    } as unknown as Event;

    component.onUnreadOnlyChange(event);

    expect(mockNotificationService.setUnreadOnly).toHaveBeenCalledWith(true);
  });

  it('does not reload inbox list when opening notifications with cached items and no error', () => {
    (mockNotificationService.items as any).mockReturnValueOnce([
      {
        notificationRecipientId: 1,
        notificationId: 10,
        notificationKey: 'notif-1',
      },
    ]);
    mockNotificationService.listError.mockReturnValueOnce(null);

    component.toggleNotification();

    expect(component.isNotificationOpen).toBe(true);
    expect(mockNotificationService.refreshUnreadCount).toHaveBeenCalledTimes(1);
    expect(mockNotificationService.loadFirstPage).not.toHaveBeenCalled();
  });

  it('shows approval search items only for allowed roles', () => {
    mockAuthService.userRole.mockReturnValue('Supervisor');
    component.searchQuery.set('อนุมัติ');

    const results = component.filteredSearchResults();

    expect(results.some((item) => item.path === '/approvals')).toBe(true);
    expect(results.some((item) => item.path === '/approvals-medicalexpenses')).toBe(true);
  });

  it('hides restricted search items from roles without access', () => {
    mockAuthService.userRole.mockReturnValue('it-staff');
    component.searchQuery.set('อนุมัติ');

    expect(component.filteredSearchResults()).toEqual([]);
  });

  it('formats actor name by removing title and appending nickname', () => {
    const result = component.formatActorName({
      actorName: 'นาย สมชาย ใจดี',
      actorNickname: 'เอ็ม',
    } as any);

    expect(result).toBe('สมชาย (เอ็ม)');
  });

  it('maps notification state helpers correctly', () => {
    mockNotificationService.activeRecipientIds.mockReturnValueOnce(new Set(['10']));
    const item = {
      notificationRecipientId: 10,
      notificationType: 'ticket_reply_added',
      targetType: 'ticket',
      isRead: true,
      ticketId: 55,
    } as any;

    expect(component.isNotificationBusy(item)).toBe(true);
    expect(component.getNotificationIcon(item)).toBe('fa-comment-dots');
    expect(component.getNotificationAccent(item)).toBe('accent-info');
    expect(component.hasTicketReference(item)).toBe(true);
  });

  it('clears search state after navigation', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.searchQuery.set('allowance');
    component.isSearchFocused.set(true);
    component.isMobileSearchOpen.set(true);

    component.navigateTo('/allowance');

    expect(navigateSpy).toHaveBeenCalledWith(['/allowance']);
    expect(component.searchQuery()).toBe('');
    expect(component.isSearchFocused()).toBe(false);
    expect(component.isMobileSearchOpen()).toBe(false);
  });

  it('closes open menus on outside click', () => {
    component.isProfileOpen = true;
    component.isNotificationOpen = true;
    component.isSearchFocused.set(true);

    component.clickout({
      target: document.createElement('button'),
    } as unknown as MouseEvent);

    expect(component.isProfileOpen).toBe(false);
    expect(component.isNotificationOpen).toBe(false);
    expect(component.isSearchFocused()).toBe(false);
  });

  it('logs out and routes to login', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.isProfileOpen = true;

    component.logout();

    expect(component.isProfileOpen).toBe(false);
    expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
