import { Component, EventEmitter, inject, Input, OnInit, Output, signal, ViewChild } from '@angular/core';
import { TextEditorComponent } from '../../../../components/shared/text-editor/text-editor';
import { SwalService } from '../../../../services/swal.service';

@Component({
  selector: 'app-email-reply-modal',
  standalone: true,
  imports: [TextEditorComponent],
  templateUrl: './email-reply-modal.html',
  styleUrl: './email-reply-modal.scss',
})
export class EmailReplyModal implements OnInit {
  @ViewChild(TextEditorComponent) private textEditor!: TextEditorComponent;
  @Input() ticket: any;
  @Output() submitModal = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<void>();

  message = '';
  isSubmitting = signal(false);
  private readonly swalService = inject(SwalService);

  ngOnInit(): void {
    const description = this.ticket?.description ?? '';
    if (!description) {
      this.message = '';
      return;
    }

    const senderName = this.escapeHtml(String(this.ticket?.requesterName || 'ผู้ส่ง'));
    const senderEmail = this.ticket?.requesterEmail
      ? ` &lt;${this.escapeHtml(String(this.ticket.requesterEmail))}&gt;`
      : '';
    const sentAt = this.ticket?.createdDate ? new Date(this.ticket.createdDate) : null;
    let datePrefix = '';
    if (sentAt && !Number.isNaN(sentAt.getTime())) {
      const date = new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Bangkok',
      }).format(sentAt);
      const time = new Intl.DateTimeFormat('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone: 'Asia/Bangkok',
      }).format(sentAt);
      datePrefix = `ในวันที่ ${date} เวลา ${time} `;
    }
    const originalHeader = `<p>${datePrefix}${senderName}${senderEmail} เขียนว่า:</p>`;

    // Start with a reply line and two blank lines before the original email.
    this.message =
      '<p><br></p><p><br></p><p><br></p>' +
      originalHeader +
      `<blockquote>${description}</blockquote>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

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
