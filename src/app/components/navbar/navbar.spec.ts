import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideRouter } from '@angular/router';
import { EMPTY } from 'rxjs';

import { NavbarComponent } from './navbar';
import { SignalrService } from '../../services/signalr.service';

const mockSignalrService = {
  startConnection: () => Promise.resolve(),
  on: () => EMPTY,
  sendNewTicketNotification: () => {},
  pendingNewTickets: { asReadonly: () => () => 0 },
  pendingTicketNumbers: { asReadonly: () => () => new Set() },
  refreshTrigger: { asReadonly: () => () => 0 },
};

describe('Navbar', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideRouter([]), { provide: SignalrService, useValue: mockSignalrService }],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
