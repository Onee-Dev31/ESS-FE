import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY, Subject } from 'rxjs';

import { DashboardIT } from './dashboard-it';
import { SignalrService } from '../../services/signalr.service';

function mockSignal<T>(val: T) {
  const fn = () => val;
  fn.set = (_v: T) => {};
  fn.update = (_fn: (v: T) => T) => {};
  fn.asReadonly = () => fn;
  return fn;
}

const mockSignalrService = {
  startConnection: () => Promise.resolve(),
  on: () => EMPTY,
  sendNewTicketNotification: () => {},
  pendingNewTickets: mockSignal(0),
  pendingTicketNumbers: mockSignal(new Set<string>()),
  refreshTrigger: mockSignal(0),
  ticketReadTrigger: new Subject<void>(),
};

describe('DashboardIT', () => {
  let component: DashboardIT;
  let fixture: ComponentFixture<DashboardIT>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardIT],
      providers: [{ provide: SignalrService, useValue: mockSignalrService }],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardIT);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
