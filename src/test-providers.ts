import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EMPTY } from 'rxjs';
import { NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { SignalrService } from './app/services/signalr.service';

const mockSignalrService = {
  startConnection: () => Promise.resolve(),
  on: () => EMPTY,
  sendTestRealtime: () => {},
};

const mockEchartsInstance = {
  setOption: () => {},
  resize: () => {},
  showLoading: () => {},
  hideLoading: () => {},
  on: () => {},
  off: () => {},
  dispose: () => {},
  isDisposed: () => false,
};

const mockEcharts = {
  init: () => mockEchartsInstance,
};

export default [
  provideHttpClientTesting(),
  { provide: NGX_ECHARTS_CONFIG, useValue: { echarts: async () => mockEcharts } },
  { provide: SignalrService, useValue: mockSignalrService },
];
