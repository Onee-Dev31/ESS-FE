import { Component, EventEmitter, Input, Output, ViewChild, inject, signal } from '@angular/core';
import { MessageComposer } from '../message-composer/message-composer';
import { SwalService } from '../../../../services/swal.service';

@Component({
  selector: 'app-close-ticket-modal',
  standalone: true,
  imports: [MessageComposer],
  templateUrl: './close-ticket-modal.html',
  styleUrl: '../email-reply-modal/email-reply-modal.scss',
})
export class CloseTicketModal {
  @Input() ticket: any;
  @Output() closeModal = new EventEmitter<void>();
  @Output() submitModal = new EventEmitter<{ reason: string }>();
  @ViewChild(MessageComposer) private composer!: MessageComposer;
  private readonly swalService = inject(SwalService);
  reason = '';
  readonly isSubmitting = signal(false);

  get hasReason(): boolean {
    const content = document.createElement('template');
    content.innerHTML = this.reason;
    return (
      !!content.content.textContent?.replace(/[\s\u200B-\u200D\uFEFF]/g, '') ||
      !!content.content.querySelector('img')
    );
  }

  close(): void {
    if (this.isSubmitting()) return;
    this.composer.clearImages();
    this.closeModal.emit();
  }

  submit(): void {
    if (!this.hasReason || !this.ticket?.ticketId || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.composer.confirmImages().subscribe({
      next: (reason) => {
        this.submitModal.emit({ reason });
        this.isSubmitting.set(false);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.swalService.warning(
          'ไม่สามารถเตรียมรูปภาพได้',
          error?.error?.message || error?.message || 'กรุณาลองใหม่อีกครั้ง',
        );
      },
    });
  }
}
