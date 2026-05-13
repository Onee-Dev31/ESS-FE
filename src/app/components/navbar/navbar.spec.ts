import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NavbarComponent } from './navbar';
import { SignalrService } from '../../services/signalr.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';

const mockSignalrService = {
  startConnection: () => Promise.resolve(),
  on: () => of(),
  sendNewTicketNotification: () => {},
  pendingNewTickets: { asReadonly: () => () => 0 },
  pendingTicketNumbers: { update: vi.fn() },
  refreshTrigger: { update: vi.fn() },
  ticketReadTrigger: new Subject<void>(),
  ticketFocusTrigger: new Subject<number>(),
  ticketStatusTrigger: new Subject<{ ticketId: any; status: string }>(),
  recentlySubmittedTickets: new Set<string>(),
};

const mockNotificationService = {
  getUnreadCount: vi.fn(() => of({ success: true, unreadCount: 0 })),
  getMyNotifications: vi.fn(() =>
    of({ success: true, data: [], totalRecords: 0, page: 1, pageSize: 20, unreadOnly: true }),
  ),
  markAsRead: vi.fn(() => of({ success: true, message: 'ok', affectedRows: 1 })),
  markAllAsRead: vi.fn(() => of({ success: true, message: 'ok', affectedRows: 0 })),
};

const mockAuthService = {
  currentUser: () => 'tester',
  userRole: () => 'it-staff',
  userData: () => ({
    CODEMPID: 'EMP001',
    NAMFIRSTE: 'Test',
    NAMLASTE: 'User',
  }),
  logout: vi.fn(),
};

describe('Navbar', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignalrService.ticketReadTrigger = new Subject<void>();
    mockSignalrService.ticketFocusTrigger = new Subject<number>();
    mockSignalrService.ticketStatusTrigger = new Subject<{ ticketId: any; status: string }>();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([]),
        { provide: SignalrService, useValue: mockSignalrService },
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

  it('marks notification as read via NotificationService and navigates', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onNotificationClick({
      id: 10,
      title: 'Ticket',
      message: 'Unread ticket',
      status: 'pending',
      time: 'เมื่อสักครู่',
      route: '/it-dashboard',
      readTicketId: 55,
      ticketNumber: 'IT-001',
    });

    expect(mockNotificationService.markAsRead).toHaveBeenCalledWith(
      expect.objectContaining({ notificationRecipientId: 55 }),
    );
    expect(mockSignalrService.pendingTicketNumbers.update).toHaveBeenCalledTimes(1);
    expect(mockSignalrService.refreshTrigger.update).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(
      ['/it-dashboard'],
      expect.objectContaining({ queryParams: expect.objectContaining({ focusZone: 'tickets' }) }),
    );
  });

  it('does not call markAsRead for notifications without readTicketId', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onNotificationClick({
      id: 99,
      title: 'มี Chat ใหม่',
      message: 'Informational notification',
      status: 'pending',
      time: 'เมื่อสักครู่',
      route: '/it-dashboard',
    });

    expect(mockNotificationService.markAsRead).not.toHaveBeenCalled();
    expect(mockSignalrService.pendingTicketNumbers.update).not.toHaveBeenCalled();
    expect(mockSignalrService.refreshTrigger.update).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(
      ['/it-dashboard'],
      expect.objectContaining({ queryParams: expect.objectContaining({ focusZone: 'tickets' }) }),
    );
  });
});
