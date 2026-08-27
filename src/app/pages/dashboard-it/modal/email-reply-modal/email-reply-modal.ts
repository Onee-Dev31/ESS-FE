import { Component, EventEmitter, inject, Input, Output, signal, ViewChild } from '@angular/core';
import { TextEditorComponent } from '../../../../components/shared/text-editor/text-editor';
import { SwalService } from '../../../../services/swal.service';

@Component({
  selector: 'app-email-reply-modal',
  standalone: true,
  imports: [TextEditorComponent],
  templateUrl: './email-reply-modal.html',
  styleUrl: './email-reply-modal.scss',
})
export class EmailReplyModal {
  @ViewChild(TextEditorComponent) private textEditor!: TextEditorComponent;
  @Input() ticket: any;
  @Output() submitModal = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<void>();

  message = '';
  isSubmitting = signal(false);
  private readonly swalService = inject(SwalService);

  get hasMessage(): boolean {
    const html = this.message ?? '';
    const hasText =
      html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim().length > 0;
    const hasImage = /<img\b[^>]*>/i.test(html);

    return hasText || hasImage;
  }

  onMessageChange(value: string | null): void {
    this.message = value ?? '';
  }

  close(): void {
    this.textEditor?.clearImages();
    this.closeModal.emit();
  }

  submit(): void {
    if (!this.hasMessage || !this.ticket?.ticketId || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.textEditor.confirmImages().subscribe({
      next: (message) => {
        this.submitModal.emit({
          id: this.ticket.ticketId,
          message,
          attachments: [],
        });
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
