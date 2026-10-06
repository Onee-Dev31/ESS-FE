import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { AvatarPreviewModal } from '../../modals/avatar-preview-modal/avatar-preview-modal';
import { TicketStatusPillComponent } from '../ticket-status-pill/ticket-status-pill';
import { TicketStatusAudience } from '../ticket-status-pill/ticket-status.model';
import { SafeEmailHtmlPipe } from '../../../pipes/safe-email-html.pipe';

@Component({
  selector: 'app-ticket-progress-card',
  standalone: true,
  imports: [CommonModule, AvatarPreviewModal, TicketStatusPillComponent, SafeEmailHtmlPipe],
  templateUrl: './ticket-progress-card.html',
  styleUrl: './ticket-progress-card.scss',
})
export class TicketProgressCardComponent {
  @Input({ required: true }) ticket!: any;
  @Input({ required: true }) audience!: TicketStatusAudience;
  @Input() showNoteButton = false;
  @Input() showWaitingItTemplate = false;
  @Output() noteClick = new EventEmitter<void>();

  selectedAssignee = signal<any | null>(null);

  isRichReason(reason: string): boolean {
    // Rich Text : ข้อความที่จัดรูปแบบได้
    return /<(?:p|br|div|strong|em|u|span|img|a|ol|ul|li)\b[^>]*>/i.test(reason);
  }

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
