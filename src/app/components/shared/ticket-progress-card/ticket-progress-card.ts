import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { AvatarPreviewModal } from '../../modals/avatar-preview-modal/avatar-preview-modal';
import { TicketStatusPillComponent } from '../ticket-status-pill/ticket-status-pill';
import { TicketStatusAudience } from '../ticket-status-pill/ticket-status.model';

@Component({
  selector: 'app-ticket-progress-card',
  standalone: true,
  imports: [CommonModule, AvatarPreviewModal, TicketStatusPillComponent],
  templateUrl: './ticket-progress-card.html',
  styleUrl: './ticket-progress-card.scss',
})
export class TicketProgressCardComponent {
  @Input({ required: true }) ticket!: any;
  @Input({ required: true }) audience!: TicketStatusAudience;
  @Input() showNoteButton = false;
  @Output() noteClick = new EventEmitter<void>();

  selectedAssignee = signal<any | null>(null);

  isToday(value: string | Date): boolean {
    const date = new Date(value);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  selectAssignee(assignee: any): void {
    this.selectedAssignee.set(assignee);
    console.log('Selected Assignee:', assignee);
  }
}
