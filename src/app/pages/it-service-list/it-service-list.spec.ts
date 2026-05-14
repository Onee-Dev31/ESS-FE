import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EMPTY, Subject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

import { ItService } from './it-service-list';
import { SignalrService } from '../../services/signalr.service';
import { ItServiceService } from '../../services/it-service.service';
import { AuthService } from '../../services/auth.service';

const mockSignalrService = {
  startConnection: () => Promise.resolve(),
  on: () => EMPTY,
  sendNewTicketNotification: () => {},
  ticketStatusTrigger: new Subject<{ ticketId: any; status: string }>(),
  ticketReadTrigger: new Subject<void>(),
  ticketFocusTrigger: new Subject<number>(),
  pendingTicketNumbers: { update: () => {} },
  refreshTrigger: { update: () => {} },
};

const mockActivatedRoute = {
  queryParams: EMPTY,
};

const mockItServiceService = {
  getMyTickets: () => EMPTY,
  getTicketById: () => EMPTY,
  markTicketRead: () => EMPTY,
  replyTicket: () => EMPTY,
  re_open: () => EMPTY,
  re_submit: () => EMPTY,
};

const mockAuthService = {
  userData: () => ({ CODEMPID: 'TEST001', AD_USER: 'test.user' }),
  currentUser: () => 'test.user',
  userRole: () => 'user',
};

describe('ItService', () => {
  let component: ItService;
  let fixture: ComponentFixture<ItService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItService],
      providers: [
        { provide: SignalrService, useValue: mockSignalrService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ItServiceService, useValue: mockItServiceService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ItService);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
