/**
 * @file Global Error Handler
 * @description Logic for Global Error Handler
 */

// Section: Imports
import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ErrorService } from '../services/error';

// Section: Logic
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    private errorService = inject(ErrorService);

    handleError(error: any): void {

        console.error('[Global Error Handler]', error);


        this.errorService.handle(error, {
            component: 'Global',
            action: 'unhandled-error'
        });
    }
}
