import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ErrorService } from '../services/error';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    private errorService = inject(ErrorService);

    handleError(error: unknown): void {
        console.error('[Global Error Handler]', error);

        this.errorService.handle(error, {
            component: 'Global',
            action: 'unhandled-error'
        });
    }
}
