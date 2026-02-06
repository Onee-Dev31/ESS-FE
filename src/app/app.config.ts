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

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor])
    ),
    provideRouter(routes), provideIcons({
      heroCurrencyDollarSolid,
      tablerCar,
      bootstrapTaxiFrontFill,
      tablerFriends,
      matSelfImprovement,
      tablerGrave2,
      tablerFlower
    })
  ]
};
