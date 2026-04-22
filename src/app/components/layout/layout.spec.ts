import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { EMPTY } from 'rxjs';

import { LayoutComponent } from './layout';
import { SignalrService } from '../../services/signalr.service';

const mockSignalrService = {
  startConnection: () => Promise.resolve(),
  on: () => EMPTY,
  sendNewTicketNotification: () => {},
  pendingNewTickets: { asReadonly: () => () => 0 },
  pendingTicketNumbers: { asReadonly: () => () => new Set() },
  refreshTrigger: { asReadonly: () => () => 0 },
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
