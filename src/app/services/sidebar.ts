import { Injectable, signal } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class SidebarService {
  isCollapsed = signal(false);
  toggle() {
    this.isCollapsed.update(val => !val);

    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
  }

}