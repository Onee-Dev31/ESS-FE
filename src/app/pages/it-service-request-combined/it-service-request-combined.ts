import { CommonModule, NgComponentOutlet } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, PLATFORM_ID, signal, Type } from '@angular/core';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SwalService } from '../../services/swal.service';
import { ITServiceRequestComponent } from '../it-service-request/it-service-request';
import { ITServiceRequestSpecificComponent } from '../it-service-request-specific/it-service-request-specific';

type RequestTab = 'basic' | 'specific';

interface RequestTabItem {
  key: RequestTab;
  label: string;
  description: string;
  icon: string;
  component: Type<unknown>;
}

@Component({
  selector: 'app-it-service-request-combined',
  standalone: true,
  imports: [CommonModule, NgComponentOutlet, PageHeaderComponent],
  templateUrl: './it-service-request-combined.html',
  styleUrl: './it-service-request-combined.scss',
})
export class ITServiceRequestCombinedComponent {
  private readonly swalService = inject(SwalService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly tabs: RequestTabItem[] = [
    {
      key: 'basic',
      label: 'ระบบพื้นฐาน',
      description: 'บริการและสิทธิ์การใช้งาน IT ทั่วไป',
      icon: 'fa-solid fa-layer-group',
      component: ITServiceRequestComponent,
    },
    {
      key: 'specific',
      label: 'ระบบเฉพาะ',
      description: 'สิทธิ์เข้าใช้งานระบบเฉพาะทาง',
      icon: 'fa-solid fa-server',
      component: ITServiceRequestSpecificComponent,
    },
  ];

  readonly activeTab = signal<RequestTab>('basic');
  readonly isSwitching = signal(false);
  private readonly dirtyTabs = signal<Record<RequestTab, boolean>>({
    basic: false,
    specific: false,
  });

  readonly activeTabItem = computed(
    () => this.tabs.find((tab) => tab.key === this.activeTab()) ?? this.tabs[0],
  );
  readonly componentInputs = { openBy: 'IT' };

  constructor() {
    this.removeLegacyTabQueryParam();
  }

  async selectTab(nextTab: RequestTab): Promise<void> {
    const currentTab = this.activeTab();
    if (nextTab === currentTab || this.isSwitching()) return;

    if (this.dirtyTabs()[currentTab]) {
      this.isSwitching.set(true);
      const result = await this.swalService.confirm(
        'ยืนยันการเปลี่ยนหมวดหมู่?',
        'ข้อมูลที่กรอกไว้ในฟอร์มนี้จะไม่ถูกบันทึกและจะถูกล้างเมื่อเปลี่ยนแท็บ',
      );
      this.isSwitching.set(false);

      if (!result.isConfirmed) return;
    }

    this.dirtyTabs.update((state) => ({ ...state, [currentTab]: false }));
    this.activeTab.set(nextTab);
  }

  markCurrentTabDirty(): void {
    const tab = this.activeTab();
    if (this.dirtyTabs()[tab]) return;
    this.dirtyTabs.update((state) => ({ ...state, [tab]: true }));
  }

  onFormClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const interactive = target.closest(
      'input, textarea, select, nz-select, nz-date-picker, nz-range-picker, button, [role="checkbox"], [role="radio"], .checkbox-item, .service-card, .system-card',
    );
    if (interactive) this.markCurrentTabDirty();
  }

  private removeLegacyTabQueryParam(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const url = new URL(window.location.href);
    if (!url.searchParams.has('tab')) return;

    url.searchParams.delete('tab');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }

}
