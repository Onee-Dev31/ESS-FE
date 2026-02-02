import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertService, AlertState } from '../../../services/alert.service';

@Component({
  selector: 'app-alert-modals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert-modals.html',
  styleUrl: './alert-modals.scss',
})
export class AlertModals {
  private alertService = inject(AlertService);


  state$ = this.alertService.alertState$;


  close() {
    this.alertService.hide();
  }

  getIconClass(type: string): string {
    switch (type) {
      case 'success': return 'fas fa-check-circle text-green';
      case 'error': return 'fas fa-times-circle text-red';
      case 'warning': return 'fas fa-exclamation-triangle text-yellow';
      case 'info': return 'fas fa-info-circle text-blue';
      default: return 'fas fa-info-circle';
    }
  }

  getBtnClass(type: string): string {
    return `btn-confirm btn-${type}`;
  }
}
