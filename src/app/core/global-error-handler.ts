import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ErrorService } from '../services/error';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    private errorService = inject(ErrorService);

    handleError(error: any): void {
        // Log to console for debugging
        console.error('[Global Error Handler]', error);

        // Handle the error with ErrorService
        this.errorService.handle(error, {
            component: 'Global',
            action: 'unhandled-error'
        });
    }
}
