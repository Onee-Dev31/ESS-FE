import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TextEditorComponent } from '../../../../components/shared/text-editor/text-editor';
import { SwalService } from '../../../../services/swal.service';
import { ItServiceService } from '../../../../services/it-service.service';

@Component({
  selector: 'app-email-reply-modal',
  standalone: true,
  imports: [TextEditorComponent, FormsModule],
  templateUrl: './email-reply-modal.html',
  styleUrl: './email-reply-modal.scss',
})
export class EmailReplyModal implements OnInit {
  @ViewChild(TextEditorComponent) private textEditor!: TextEditorComponent;
  @Input() ticket: any;
  @Output() submitModal = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<void>();

  message = '';
  quotedMessage = '';
  isSubmitting = signal(false);

  to = '';
  cc: string[] = [];
  ccInput = '';

  private readonly swalService = inject(SwalService);
  private readonly itServiceService = inject(ItServiceService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly replyNotice =
    'หากท่านมีคำถามหรือข้อมูลเพิ่มเติมเกี่ยวกับปัญหาดังกล่าว สามารถตอบกลับอีเมลนี้ได้ทันที';

  ngOnInit(): void {
    this.loadRecipients();
    const originalDescription = this.ticket?.description ?? '';
    if (!originalDescription) {
      this.message = '';
      this.quotedMessage = '';
      return;
    }
    const description = this.removePreviousReplyNotices(originalDescription);

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

    const originalHeader = `
    <p>
      ${datePrefix}${senderName}${senderEmail} เขียนว่า:
    </p>
  `;

    const replyNoticeHtml = `
    <p
      data-reply-notice="true"
      style="color:#1a73e8;font-weight:600;"
    >
      <span style="margin-right:4px;">*</span>
      ${this.replyNotice}
    </p>
  `;

    // Quill รับเฉพาะข้อความตอบใหม่
    this.message = '<p><br></p>';

    // HTML เดิมไม่ผ่าน Quill
    this.quotedMessage =
      originalHeader + replyNoticeHtml + `<blockquote>${description}</blockquote>`;
  }

  private loadRecipients(): void {
    const ticketId = this.ticket?.ticketId;
    if (!ticketId) return;

    this.itServiceService.getReplyEmailRecipients(ticketId).subscribe({
      next: (res) => {
        this.to = res?.to ?? '';
        this.cc = Array.isArray(res?.cc) ? res.cc : [];
        console.log('loadRecipients', { to: this.to, cc: this.cc });
        // สั่ง render ทันทีตรงนี้ ก่อนที่ zone จะ tick ทับ ป้องกัน NG0100
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.swalService.warning(
          'ไม่สามารถโหลดรายชื่อผู้รับได้',
          error?.error?.message || error?.message || 'กรุณาลองใหม่อีกครั้ง',
        );
      },
    });
  }

  addCcTag(): void {
    const value = this.ccInput.trim().replace(/,$/, '');
    this.ccInput = '';
    if (!value) return;
    if (this.cc.includes(value)) return;

    this.cc.push(value);
  }

  removeCcTag(index: number): void {
    this.cc.splice(index, 1);
  }

  onCcInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addCcTag();
    }
  }

  private removePreviousReplyNotices(html: string): string {
    const template = document.createElement('template');
    template.innerHTML = html;

    // เวอร์ชันใหม่: ลบ notice ทั้งก้อน รวม *
    template.content.querySelectorAll('[data-reply-notice="true"]').forEach((el) => el.remove());

    const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);

    const nodes: { node: Text; start: number; end: number }[] = [];
    let text = '';
    let node: Node | null;

    while ((node = walker.nextNode())) {
      const start = text.length;
      text += node.textContent ?? '';

      nodes.push({
        node: node as Text,
        start,
        end: text.length,
      });
    }

    // รองรับข้อความเก่าที่ไม่มี data-reply-notice
    const pattern = new RegExp(
      `\\*?\\s*${Array.from(this.replyNotice.replace(/\s/g, ''))
        .map((character) => character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('\\s*')}`,
      'g',
    );

    const matches = Array.from(text.matchAll(pattern));

    for (const match of matches.reverse()) {
      const start = match.index!;
      const end = start + match[0].length;

      for (const entry of nodes) {
        const from = Math.max(start, entry.start);
        const to = Math.min(end, entry.end);

        if (from < to) {
          entry.node.deleteData(from - entry.start, to - from);
        }
      }
    }

    return template.innerHTML;
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
      next: (replyMessage) => {
        const fullMessage = replyMessage + this.quotedMessage;

        const payload = {
          id: this.ticket.ticketId,
          message: fullMessage,
          to: this.to,
          cc: this.cc,
          attachments: [],
        };

        console.log('submit email reply', payload);

        // this.submitModal.emit(payload);
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
