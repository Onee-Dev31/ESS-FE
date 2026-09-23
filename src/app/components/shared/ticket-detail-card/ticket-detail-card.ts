import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { ExpandIconComponent } from '../icon/expand-icon';
import { TicketStatusAudience } from '../ticket-status-pill/ticket-status.model';
import { TextEditorComponent } from '../text-editor/text-editor';
import { SafeEmailHtmlPipe } from '../../../pipes/safe-email-html.pipe';
import { ImageErrorFallbackDirective } from '../../../directives/image-error-fallback.directive';
import { OpenDescriptionImageDirective } from '../../../directives/open-description-image.directive';

@Component({
  selector: 'app-ticket-detail-card',
  standalone: true,
  imports: [
    CommonModule,
    ExpandIconComponent,
    TextEditorComponent,
    SafeEmailHtmlPipe,
    ImageErrorFallbackDirective,
    OpenDescriptionImageDirective,
  ],
  templateUrl: './ticket-detail-card.html',
  styleUrl: './ticket-detail-card.scss',
})
export class TicketDetailCardComponent implements OnChanges {
  @ViewChild(TextEditorComponent) textEditor?: TextEditorComponent;
  @Input({ required: true }) ticket!: any;
  @Input({ required: true }) audience!: TicketStatusAudience;
  @Input() editable = false;
  @Input() reportDetailPage = false;
  @Input() copied = false;
  @Input() serviceLimit = 3;
  @Input() alertMessage = '';
  @Input() newAttachmentCount = 0;
  @Output() attachmentClick = new EventEmitter<any[]>();
  @Output() servicesClick = new EventEmitter<any[]>();
  @Output() descriptionChange = new EventEmitter<string>();
  @Output() copyClick = new EventEmitter<void>();
  @Output() changeTypeClick = new EventEmitter<void>();
  @Output() typeInfoClick = new EventEmitter<void>();
  @Output() detailClick = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges): void {
    // if (changes['ticket']) {
    //   console.log('[TicketDetailCard] ticket.description:', this.ticket?.description);
    // }
  }

  get attachments(): any[] {
    return this.ticket?.attachments ?? [];
  }

  get allAttachments(): any[] {
    return [...this.attachments, ...(this.ticket?.itAttachments ?? [])];
  }
  get services(): any[] {
    return this.ticket?.services ?? [];
  }

  get displayServices(): any[] {
    const requestUser = this.services.find((service) => this.isRequestUserService(service));
    if (!requestUser) return this.services;

    const specificServices = this.services.filter((service) => {
      const group = String(
        service?.group_type ?? service?.groupType ?? service?.service_group ?? '',
      )
        .trim()
        .toLowerCase();
      return !!group && !['main', 'basic', 'user'].includes(group);
    });
    return [requestUser, ...specificServices];
  }

  serviceName(service: any): string {
    return service?.service_name_th ?? service?.label ?? service?.service_name ?? '-';
  }

  private isRequestUserService(service: any): boolean {
    const id = Number(service?.service_type_id ?? service?.serviceTypeId ?? service?.id);
    return id === 22 || this.serviceName(service).trim().toLowerCase() === 'ขอ user';
  }

  get canChangeTicketType(): boolean {
    const isApproved =
      String(this.ticket?.approval_status ?? this.ticket?.approvalStatus ?? '')
        .trim()
        .toLowerCase() === 'approved';
    const ticketTypeId = Number(this.ticket?.ticketTypeId ?? this.ticket?.ticket_type_id);
    const isTypeChangeLocked =
      isApproved &&
      (ticketTypeId === 3 ||
        (ticketTypeId === 1 &&
          String(this.ticket?.repair_cost_type ?? this.ticket?.repairCostType ?? '')
            .trim()
            .toLowerCase() === 'paid'));
    return (
      this.audience === 'it' &&
      !isTypeChangeLocked &&
      ['In Progress', 'Assigned'].includes(this.ticket?.status)
    );
  }

  confirmImages() {
    return this.textEditor!.confirmImages();
  }

}
