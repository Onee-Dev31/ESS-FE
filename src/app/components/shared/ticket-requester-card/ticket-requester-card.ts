import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { AvatarPreviewModal } from '../../modals/avatar-preview-modal/avatar-preview-modal';

@Component({
  selector: 'app-ticket-requester-card',
  standalone: true,
  imports: [CommonModule, AvatarPreviewModal],
  templateUrl: './ticket-requester-card.html',
  styleUrl: './ticket-requester-card.scss',
})
export class TicketRequesterCardComponent {
  @Input({ required: true }) requester!: any;
  @Input() ccCount = 0;
  @Input() status = '';
  @Input() assignments: any[] = [];
  @Input() readOnly = false;
  @Output() ccClick = new EventEmitter<boolean>();

  showContact = false;
  private readonly authService = inject(AuthService);

  get canManageCc(): boolean {
    if (this.readOnly) return false;
    if (!this.status || ['New', 'Open', 'Closed', 'Denied'].includes(this.status)) return false;

    const user = this.authService.userData();
    const adUser = String(user?.AD_USER ?? '').trim().toLowerCase();
    const empCode = String(user?.CODEMPID ?? '').trim().toLowerCase();
    return (this.assignments ?? []).some(
      (assignment) =>
        (adUser && String(assignment.aduser ?? '').trim().toLowerCase() === adUser) ||
        (empCode && String(assignment.codeempid ?? '').trim().toLowerCase() === empCode),
    );
  }

  get displayName(): string {
    const nickname = this.requester?.nickname ? ` (${this.requester.nickname})` : '';
    return `${this.requester?.fullname ?? ''}${nickname}`;
  }
}
