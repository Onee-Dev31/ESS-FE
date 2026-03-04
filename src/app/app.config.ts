import { ApplicationConfig, provideBrowserGlobalErrorListeners, ErrorHandler } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { routes } from './app.routes';
import { heroCurrencyDollarSolid } from '@ng-icons/heroicons/solid';
import { tablerCar, tablerFriends, tablerGrave2, tablerFlower } from '@ng-icons/tabler-icons';
import { bootstrapTaxiFrontFill } from '@ng-icons/bootstrap-icons';
import { matSelfImprovement } from '@ng-icons/material-icons/baseline';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { errorInterceptor } from './interceptors/error.interceptor';
import { authInterceptor } from './interceptors/auth.interceptor';
import { GlobalErrorHandler } from './core/global-error-handler';

import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeTh from '@angular/common/locales/th';
import { NzI18nInterface, provideNzI18n, th_TH } from 'ng-zorro-antd/i18n';
import { provideAppNzIcons } from './icons.provider';
import { provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts';

// import { APP_INITIALIZER } from '@angular/core';
// import { firstValueFrom } from 'rxjs';
// import { AuthService } from './services/auth.service';

registerLocaleData(localeTh);

// function initAuth(authService: AuthService) {
//   return () =>
//     firstValueFrom(authService.initializeFromBackend())
//       .catch(() => Promise.resolve());
// }

const customTh: NzI18nInterface = {
  ...th_TH,
  DatePicker: {
    ...th_TH.DatePicker,
    lang: {
      ...th_TH.DatePicker.lang,
      rangeQuarterPlaceholder: ['เลือกไตรมาสเริ่มต้น', 'เลือกไตรมาสสิ้นสุด']
    }
  }
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideEchartsCore({ echarts }),
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor])
    ),
    provideRouter(routes),

    { provide: LOCALE_ID, useValue: 'th' },
    provideNzI18n(customTh)

    , provideIcons({
      heroCurrencyDollarSolid,
      tablerCar,
      bootstrapTaxiFrontFill,
      tablerFriends,
      matSelfImprovement,
      tablerGrave2,
      tablerFlower
    }),
    provideAppNzIcons(),
    // {
    //   provide: APP_INITIALIZER,
    //   useFactory: initAuth,
    //   deps: [AuthService],
    //   multi: true
    // },
  ]
};
