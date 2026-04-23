import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideRouter } from '@angular/router';
import { EMPTY, Subject } from 'rxjs';

import { NavbarComponent } from './navbar';
import { SignalrService } from '../../services/signalr.service';
import { ItServiceService } from '../../services/it-service.service';

const mockSignalrService = {
  startConnection: () => Promise.resolve(),
  on: () => EMPTY,
  sendNewTicketNotification: () => {},
  pendingNewTickets: { asReadonly: () => () => 0 },
  pendingTicketNumbers: { update: () => {} },
  refreshTrigger: { update: () => {} },
  ticketReadTrigger: new Subject<void>(),
};

const mockItService = {
  getUnreadCount: () => EMPTY,
  getUnreadTickets: () => EMPTY,
  markTicketRead: () => EMPTY,
};

describe('Navbar', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([]),
        { provide: SignalrService, useValue: mockSignalrService },
        { provide: ItServiceService, useValue: mockItService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
