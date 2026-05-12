import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY, of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivatedRoute } from '@angular/router';

import { DashboardIT } from './dashboard-it';
import { SignalrService } from '../../services/signalr.service';
import { ItServiceService } from '../../services/it-service.service';
import { AuthService } from '../../services/auth.service';

function mockSignal<T>(val: T) {
  const fn = () => val;
  fn.set = vi.fn((next: T) => {
    val = next;
  });
  fn.update = vi.fn((updater: (v: T) => T) => {
    val = updater(val);
  });
  fn.asReadonly = () => fn;
  return fn;
}

const mockSignalrService = {
  startConnection: () => Promise.resolve(),
  on: () => EMPTY,
  sendNewTicketNotification: () => {},
  noteNotify: vi.fn(),
  pendingNewTickets: mockSignal(0),
  pendingTicketNumbers: mockSignal(new Set<string>()),
  refreshTrigger: mockSignal(0),
  ticketReadTrigger: new Subject<void>(),
  ticketFocusTrigger: new Subject<number>(),
};

const mockItService = {
  getAllTickets: vi.fn(() =>
    of({
      data: [],
      summary: {},
      serviceTypes: [],
      topDepartments: [],
      topCompanies: [],
    }),
  ),
  getAssignItDropdown: vi.fn(() => of({ data: [] })),
  getTicketById: vi.fn(),
  markTicketRead: vi.fn(() => of({})),
  replyTicket: vi.fn(),
  getUnreadTickets: vi.fn(() => of([])),
};

const mockAuthService = {
  userData: () => ({
    CODEMPID: 'EMP001',
    NAMFIRSTT: 'Test',
    NAMLASTT: 'User',
  }),
  userRole: () => 'it-staff',
  currentUser: () => 'testuser',
};

const mockActivatedRoute = {
  queryParams: of({}),
  snapshot: { queryParamMap: { get: () => null } },
};

describe('DashboardIT', () => {
  let component: DashboardIT;
  let fixture: ComponentFixture<DashboardIT>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignalrService.ticketReadTrigger = new Subject<void>();
    mockSignalrService.ticketFocusTrigger = new Subject<number>();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardIT],
      providers: [
        { provide: SignalrService, useValue: mockSignalrService },
        { provide: ItServiceService, useValue: mockItService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardIT);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('maps unread ticket ids from the unread tickets API', () => {
    mockItService.getUnreadTickets.mockReturnValue(
      of({
        data: [{ id: 123 }, { ticketId: 456 }],
      }) as any,
    );

    component.fetchUnreadIds();

    expect(component.unreadTicketIds().has(123)).toBe(true);
    expect(component.unreadTicketIds().has(456)).toBe(true);
  });

  it('sends note notification only after note save succeeds', () => {
    vi.spyOn(component, 'getAllTickets').mockImplementation(() => {});
    vi.spyOn(component, 'selectTicket').mockImplementation(() => {});
    component.selectedTicket.set({ requesterAduser: 'req.aduser' });
    mockItService.replyTicket.mockReturnValue(
      of({
        success: true,
        message: 'saved',
      }),
    );

    component.submitNote({
      id: '123',
      message: 'hello',
      attachments: [],
    });

    expect(mockItService.replyTicket).toHaveBeenCalled();
    expect(mockSignalrService.noteNotify).toHaveBeenCalledWith(
      '123',
      'req.aduser',
      'testuser',
      'Test User',
      'hello',
    );
  });

  it('does not send note notification when note save fails', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    component.selectedTicket.set({ requesterAduser: 'req.aduser' });
    mockItService.replyTicket.mockReturnValue(throwError(() => new Error('boom')));

    component.submitNote({
      id: '123',
      message: 'hello',
      attachments: [],
    });

    expect(mockSignalrService.noteNotify).not.toHaveBeenCalled();
  });
});
