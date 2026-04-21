import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { SignalrService } from './app/services/signalr.service';
import { EMPTY } from 'rxjs';

const mockSignalrService = {
  startConnection: () => Promise.resolve(),
  on: () => EMPTY,
  sendTestRealtime: () => {},
};

export default [
  provideHttpClientTesting(),
  provideRouter([]),
  { provide: NGX_ECHARTS_CONFIG, useValue: { echarts: () => import('echarts') } },
  { provide: SignalrService, useValue: mockSignalrService },
];
