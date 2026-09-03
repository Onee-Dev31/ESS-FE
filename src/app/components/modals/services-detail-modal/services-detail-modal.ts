import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-services-detail-modal',
  imports: [CommonModule],
  templateUrl: './services-detail-modal.html',
  styleUrl: './services-detail-modal.scss',
})
export class ServicesDetailModal {
  @Output() onClose = new EventEmitter<void>();
  @Input() services: any[] = [];
  keepOrder = () => 0;

  groupedServices: Record<string, any[]> = {};

  ngOnChanges() {
    this.groupServices();
  }

  groupServices() {
    const grouped = this.services.reduce((acc: any, service: any) => {
      const key = service.group_type || 'อื่นๆ';

      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push(service);
      return acc;
    }, {});

    this.groupedServices = {
      main: grouped.main ?? {},

      ...Object.fromEntries(Object.entries(grouped).filter(([key]) => key !== 'main')),
    };
  }

  close() {
    this.onClose.emit();
  }
}
