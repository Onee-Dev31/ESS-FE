import { Injectable, signal } from '@angular/core';
import { Observable, tap, finalize, catchError } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class LoadingService {
    private loadingCount = 0;
    private _isLoading = signal<boolean>(false);

    isLoading = this._isLoading.asReadonly();

    show() {
        this.loadingCount++;
        this._isLoading.set(true);
    }

    hide() {
        this.loadingCount--;
        if (this.loadingCount <= 0) {
            this.loadingCount = 0;
            this._isLoading.set(false);
        }
    }

    /**
     * Wraps an observable with loading show/hide logic.
     * Ensures hide is called exactly once per show, either on first release or error/unsub.
     */
    wrap<T>(obs: Observable<T>): Observable<T> {
        this.show();
        let hasHidden = false;
        const hideOnce = () => {
            if (!hasHidden) {
                this.hide();
                hasHidden = true;
            }
        };

        return obs.pipe(
            tap({
                next: hideOnce,
                error: hideOnce
            }),
            finalize(hideOnce)
        );
    }
}
