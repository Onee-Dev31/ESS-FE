import { Injectable, signal } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class SidebarService {
  isCollapsed = signal(false);
  setCollapsed(value: boolean) {
    this.isCollapsed.set(value);
  }

  toggle() {
    // If screen is 1024px or less, force it to stay collapsed
    if (window.innerWidth <= 1024) {
      this.setCollapsed(true);
      return;
    }

    this.isCollapsed.update(val => !val);

    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
  }

}