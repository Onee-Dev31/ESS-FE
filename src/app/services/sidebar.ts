import { Injectable, signal } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class SidebarService {
  isCollapsed = signal(true);

  setCollapsed(value: boolean) {
    this.isCollapsed.set(value);
  }

  toggle() {


    this.isCollapsed.update(val => !val);

    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
  }
}