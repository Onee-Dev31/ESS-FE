import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NavbarComponent } from './navbar';
import { SignalrService } from '../../services/signalr.service';
import { ItServiceService } from '../../services/it-service.service';
import { AuthService } from '../../services/auth.service';

const mockSignalrService = {
  startConnection: () => Promise.resolve(),
  on: () => of(),
  sendNewTicketNotification: () => {},
  pendingNewTickets: { asReadonly: () => () => 0 },
  pendingTicketNumbers: { update: vi.fn() },
  refreshTrigger: { update: vi.fn() },
  ticketReadTrigger: new Subject<void>(),
};

const mockItService = {
  getUnreadCount: vi.fn(() => of({ unreadCount: 0 })),
  getUnreadTickets: vi.fn(() => of([])),
  markTicketRead: vi.fn(() => of({})),
};

const mockAuthService = {
  currentUser: () => 'tester',
  userRole: () => 'it-staff',
  userData: () => ({
    CODEMPID: 'EMP001',
    NAMFIRSTT: 'Test',
    NAMLASTT: 'User',
  }),
  logout: vi.fn(),
};

describe('Navbar', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignalrService.ticketReadTrigger = new Subject<void>();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([]),
        { provide: SignalrService, useValue: mockSignalrService },
        { provide: ItServiceService, useValue: mockItService },
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

  it('marks unread ticket notifications as read and navigates', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fetchUnreadCountSpy = vi.spyOn(component, 'fetchUnreadCount');
    const fetchUnreadTicketsSpy = vi.spyOn(component, 'fetchUnreadTickets');

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

    expect(mockItService.markTicketRead).toHaveBeenCalledWith(55, 'EMP001');
    expect(mockSignalrService.pendingTicketNumbers.update).toHaveBeenCalledTimes(1);
    expect(mockSignalrService.refreshTrigger.update).toHaveBeenCalledTimes(1);
    expect(fetchUnreadCountSpy).toHaveBeenCalled();
    expect(fetchUnreadTicketsSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(
      ['/it-dashboard'],
      expect.objectContaining({ queryParams: expect.objectContaining({ focusZone: 'tickets' }) }),
    );
  });

  it('does not mark informational notifications as read', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onNotificationClick({
      id: 99,
      title: 'มี Note ใหม่',
      message: 'Informational notification',
      status: 'pending',
      time: 'เมื่อสักครู่',
      route: '/it-dashboard',
    });

    expect(mockItService.markTicketRead).not.toHaveBeenCalled();
    expect(mockSignalrService.pendingTicketNumbers.update).not.toHaveBeenCalled();
    expect(mockSignalrService.refreshTrigger.update).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(
      ['/it-dashboard'],
      expect.objectContaining({ queryParams: expect.objectContaining({ focusZone: 'tickets' }) }),
    );
  });
});
