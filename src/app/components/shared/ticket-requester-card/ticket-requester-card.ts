import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
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
  @Output() ccClick = new EventEmitter<void>();

  showContact = false;

  get displayName(): string {
    const nickname = this.requester?.nickname ? ` (${this.requester.nickname})` : '';
    return `${this.requester?.fullname ?? ''}${nickname}`;
  }
}
