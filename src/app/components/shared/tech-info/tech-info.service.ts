import { Injectable, signal, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface CapturedCall {
  method: string;
  path: string;
  status: number | null;
  duration: number | null;
  timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class TechInfoService {
  private router = inject(Router);

  currentRoute = signal('');
  capturedCalls = signal<CapturedCall[]>([]);

  constructor() {
    this.currentRoute.set(this.router.url.split('?')[0]);
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.currentRoute.set(e.urlAfterRedirects.split('?')[0]);
        this.capturedCalls.set([]);
      });
  }

  addCall(call: CapturedCall) {
    this.capturedCalls.update(calls => [call, ...calls].slice(0, 50));
  }

  clearCalls() {
    this.capturedCalls.set([]);
  }
}
