import { Injectable, signal, computed } from '@angular/core';
import { Observable, finalize } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingStates = signal<Map<string, boolean>>(new Map());

  /**
   * Start loading for a specific key
   */
  start(key: string): void {
    const current = new Map(this.loadingStates());
    current.set(key, true);
    this.loadingStates.set(current);
  }

  /**
   * Stop loading for a specific key
   */
  stop(key: string): void {
    const current = new Map(this.loadingStates());
    current.set(key, false);
    this.loadingStates.set(current);
  }

  /**
   * Check if a specific key is loading
   */
  isLoading(key?: string): boolean {
    if (!key) {
      return this.loadingStates().get(this.GLOBAL_KEY) || false;
    }
    return this.loadingStates().get(key) || false;
  }

  /**
   * Get computed signal for a specific key
   */
  loading(key: string) {
    return computed(() => this.loadingStates().get(key) || false);
  }

  /**
   * Check if any loading is active
   */
  isAnyLoading(): boolean {
    return Array.from(this.loadingStates().values()).some(v => v);
  }

  /**
   * Clear all loading states
   */
  clearAll(): void {
    this.loadingStates.set(new Map());
  }

  // Compatibility methods for legacy code
  private readonly GLOBAL_KEY = 'global-loading';

  show() {
    this.start(this.GLOBAL_KEY);
  }

  hide() {
    this.stop(this.GLOBAL_KEY);
  }

  wrap<T>(obs: Observable<T>): Observable<T> {
    this.show();
    return obs.pipe(finalize(() => this.hide()));
  }
}
