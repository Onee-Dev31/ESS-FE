import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ExpandIconComponent } from '../icon/expand-icon';
import { TicketStatusAudience } from '../ticket-status-pill/ticket-status.model';
import { TextEditorComponent } from '../text-editor/text-editor';

@Component({
  selector: 'app-ticket-detail-card',
  standalone: true,
  imports: [CommonModule, ExpandIconComponent, TextEditorComponent],
  templateUrl: './ticket-detail-card.html',
  styleUrl: './ticket-detail-card.scss',
})
export class TicketDetailCardComponent {
  @ViewChild(TextEditorComponent) textEditor?: TextEditorComponent;
  @Input({ required: true }) ticket!: any;
  @Input({ required: true }) audience!: TicketStatusAudience;
  @Input() editable = false;
  @Input() copied = false;
  @Input() serviceLimit = 3;
  @Input() alertMessage = '';
  @Output() attachmentClick = new EventEmitter<any[]>();
  @Output() servicesClick = new EventEmitter<any[]>();
  @Output() descriptionChange = new EventEmitter<string>();
  @Output() copyClick = new EventEmitter<void>();
  @Output() detailClick = new EventEmitter<void>();

  get attachments(): any[] { return this.ticket?.attachments ?? []; }
  get services(): any[] { return this.ticket?.services ?? []; }

  confirmImages() {
    return this.textEditor!.confirmImages();
  }
}
