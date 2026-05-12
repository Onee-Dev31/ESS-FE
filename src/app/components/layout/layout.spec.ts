import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { EMPTY, Subject } from 'rxjs';

import { LayoutComponent } from './layout';
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

describe('Layout', () => {
  let component: LayoutComponent;
  let fixture: ComponentFixture<LayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: SignalrService, useValue: mockSignalrService },
        { provide: ItServiceService, useValue: mockItService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LayoutComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
