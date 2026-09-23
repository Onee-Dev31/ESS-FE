import { Component, EventEmitter, Input, Output } from '@angular/core';
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

  get basicServices(): any[] {
    const requestUser = this.allBasicServices.find((service) =>
      this.isRequestUserService(service),
    );
    return requestUser ? [requestUser] : this.allBasicServices;
  }

  get requestUserServices(): any[] {
    if (!this.allBasicServices.some((service) => this.isRequestUserService(service))) return [];
    return this.allBasicServices.filter((service) => !this.isRequestUserService(service));
  }

  get specificServices(): any[] {
    return this.services.filter((service) => {
      const group = this.serviceGroup(service);
      return !!group && !['main', 'basic', 'user'].includes(group);
    });
  }

  private get allBasicServices(): any[] {
    return this.services.filter((service) => {
      const group = this.serviceGroup(service);
      return !group || ['main', 'basic', 'user'].includes(group);
    });
  }

  private serviceGroup(service: any): string {
    return String(service?.group_type ?? service?.groupType ?? service?.service_group ?? '')
      .trim()
      .toLowerCase();
  }

  isRequestUserService(service: any): boolean {
    const id = Number(service?.service_type_id ?? service?.serviceTypeId ?? service?.id);
    return id === 22 || this.serviceName(service).trim().toLowerCase() === 'ขอ user';
  }

  serviceName(service: any): string {
    return service?.service_name_th ?? service?.label ?? service?.service_name ?? '-';
  }

  close() {
    this.onClose.emit();
  }
}
