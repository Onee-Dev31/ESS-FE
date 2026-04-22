import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { AnyRender } from '@tanstack/angular-table';
import { MedicalApiService } from '../../../services/medical-api.service';
import { BenefitPlan, PolicyContent } from '../../../interfaces';
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

  groupedServices: Record<string, any[]> = {};

  ngOnChanges() {
    this.groupServices();
  }

  groupServices() {
    this.groupedServices = this.services.reduce((acc: any, service: any) => {
      const key = service.group_type || 'อื่นๆ';

      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push(service);
      return acc;
    }, {});
  }

  close() {
    this.onClose.emit();
  }
}
