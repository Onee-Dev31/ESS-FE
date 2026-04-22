import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NGX_ECHARTS_CONFIG } from 'ngx-echarts';

export default [
  provideHttpClientTesting(),
  provideRouter([]),
  {
    provide: NGX_ECHARTS_CONFIG,
    useValue: {
      echarts: () =>
        Promise.resolve({
          init: () => ({
            setOption: () => {},
            on: () => {},
            off: () => {},
            resize: () => {},
            isDisposed: () => false,
            dispose: () => {},
            showLoading: () => {},
            hideLoading: () => {},
          }),
        }),
    },
  },
];
