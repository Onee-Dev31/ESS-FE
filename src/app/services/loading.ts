/**
 * @file Loading
 * @description Logic for Loading
 */

// Section: Imports
import { Injectable, signal, computed } from '@angular/core';
import { Observable, finalize } from 'rxjs';

// Section: Logic
@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingStates = signal<Map<string, boolean>>(new Map());


  start(key: string): void {
    const current = new Map(this.loadingStates());
    current.set(key, true);
    this.loadingStates.set(current);
  }


  stop(key: string): void {
    const current = new Map(this.loadingStates());
    current.set(key, false);
    this.loadingStates.set(current);
  }


  isLoading(key?: string): boolean {
    if (!key) {
      return this.loadingStates().get(this.GLOBAL_KEY) || false;
    }
    return this.loadingStates().get(key) || false;
  }


  loading(key: string) {
    return computed(() => this.loadingStates().get(key) || false);
  }


  isAnyLoading(): boolean {
    return Array.from(this.loadingStates().values()).some(v => v);
  }


  clearAll(): void {
    this.loadingStates.set(new Map());
  }


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
