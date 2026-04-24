import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EMPTY, Subject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

import { ItService } from './it-service-list';
import { SignalrService } from '../../services/signalr.service';

const mockSignalrService = {
  startConnection: () => Promise.resolve(),
  on: () => EMPTY,
  sendNewTicketNotification: () => {},
  ticketStatusTrigger: new Subject<{ ticketId: any; status: string }>(),
  ticketReadTrigger: new Subject<void>(),
  pendingTicketNumbers: { update: () => {} },
  refreshTrigger: { update: () => {} },
};

const mockActivatedRoute = {
  queryParams: EMPTY,
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
