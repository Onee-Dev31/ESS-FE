import { Injectable, signal } from '@angular/core';
import { Observable, tap, finalize, defer } from 'rxjs';

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

    wrap<T>(obs: Observable<T>): Observable<T> {
        return defer(() => {
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
        });
    }
}
