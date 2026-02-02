import { Injectable, signal } from '@angular/core';
@Injectable({ providedIn: 'root' })
/**
 * Service สำหรับจัดการสถานะการเปิด/ปิด Sidebar
 */
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