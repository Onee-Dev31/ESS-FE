import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';

import { routes } from './app.routes';

import { heroCurrencyDollarSolid } from '@ng-icons/heroicons/solid';
import { tablerCar, tablerFriends, tablerGrave2, tablerFlower } from '@ng-icons/tabler-icons';
import { bootstrapTaxiFrontFill } from '@ng-icons/bootstrap-icons';
import { matSelfImprovement } from '@ng-icons/material-icons/baseline';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),provideIcons({ 
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


// ค่าเบี้ยเลี้ยง heroCurrencyDollarSolid

// ค่ารถ tablerCar

// ค่าแท็กซี่ bootstrapTaxiFrontFill

// ค่าสมรส tablerFriends

// ค่าอุปสมบท matSelfImprovement

// ค่าฌาปนกิจ tablerGrave2

// ค่าพวงหรีด tablerFlower
