import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, inject, Input, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AvatarPreviewModal } from '../../modals/avatar-preview-modal/avatar-preview-modal';
import { SwalService } from '../../../services/swal.service';
import { AuthService } from '../../../services/auth.service';
import { ItServiceService } from '../../../services/it-service.service';
import { environment } from '../../../../environments/environment';

export interface TicketChatReader {
  userCodeempid: string;
  nickName: string;
  lastReadReplyId: number;
}

export interface TicketChatFileConfig {
  maxFiles: number;
  maxSizeMB: number;
  allowedTypes: readonly string[];
  allowedExtensions: readonly string[];
}

export interface TicketChatAttachment {
  name: string;
  size: number;
  file: File;
}

export interface TicketChatSubmit {
  id: string | number;
  message: string;
  attachments: TicketChatAttachment[];
  mentionedAdUsers: string[];
}

export type TicketChatMode = 'it-dashboard' | 'service-list';

export function isSameTicketId(left: unknown, right: unknown): boolean {
  return left != null && right != null && String(left) === String(right);
}

export const TICKET_CHAT_FILE_CONFIG: TicketChatFileConfig = {
  maxFiles: 5,
  maxSizeMB: 5,
  allowedTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ],
  allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'docx', 'xlsx', 'xls'],
};

const EMOJI_TABS = [
  {
    label: '😊',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩',
      '😘', '😋', '😛', '😜', '🤪', '😝', '😏', '🙄', '😬', '😌', '😔', '😴', '😷', '🤒',
      '🥵', '🥶', '😵', '🥳', '😎', '🤓', '😕', '🥺', '😢', '😭', '😱', '😤', '😡', '😠',
      '🤬', '😈', '👿', '💀', '👻', '👽', '🤖', '💩',
    ],
  },
  {
    label: '👍',
    emojis: [
      '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👋',
      '🤚', '🖐️', '✋', '🖖', '💪', '✍️', '🙏', '🤲', '👐', '🫶', '🤝', '👏', '✊', '👊', '🤜', '🤛',
    ],
  },
  {
    label: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '❤️‍🔥', '💔', '💕', '💞', '💓',
      '💗', '💖', '💘', '💝', '💟', '♥️', '😻', '💌', '💋', '👄',
    ],
  },
  {
    label: '🎉',
    emojis: [
      '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '⭐', '🌟', '💫', '✨', '🔥', '💯', '✅', '❌',
      '⚡', '💡', '🔔', '📢', '🎵', '🎶', '🚀', '💎', '🌈', '👑', '🎯', '🌸', '🌺', '☀️',
      '🌙', '❄️', '🌊', '⚽', '🏀', '🍕', '🍔', '☕', '🍺', '🥂', '🍰', '🎂',
    ],
  },
] as const;

@Component({
  selector: 'app-ticket-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, AvatarPreviewModal],
  templateUrl: './ticket-chat.html',
  styleUrl: './ticket-chat.scss',
})
export class TicketChatComponent {
  @Input({ required: true }) ticket: any;
  @Input() visible = true;
  @Input() isOpen = false;
  @Input() canAccess = true;
  @Input() canSend = false;
  @Input() mode: TicketChatMode = 'it-dashboard';
  @Input() unreadCount = 0;
  @Input() readers: TicketChatReader[] = [];
  @Input() highlightedTicketId: number | string | null | undefined;

  @Output() toggle = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
  @Output() submitMessage = new EventEmitter<TicketChatSubmit>();
  @Output() attachmentView = new EventEmitter<any>();
  @Output() pendingAttachmentView = new EventEmitter<any>();
  @Output() attachmentsOpen = new EventEmitter<void>();
  @Output() export = new EventEmitter<void>();

  @ViewChild('cardBody') private cardBody?: ElementRef<HTMLElement>;
  @ViewChild('chatTextarea') private chatTextarea?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('root') private root?: ElementRef<HTMLElement>;

  private readonly swalService = inject(SwalService);
  private readonly authService = inject(AuthService);
  private readonly itServiceService = inject(ItServiceService);
  private mentionQuery = '';
  private mentionAtIndex = -1;
  private mentionDebounce: ReturnType<typeof setTimeout> | null = null;
  private pendingMentionAdUsers = new Set<string>();

  readonly emojiTabs = EMOJI_TABS;
  readonly fileConfig = TICKET_CHAT_FILE_CONFIG;
  emojiPickerOpen = false;
  emojiPickerTab = 0;
  message = '';
  attachments: TicketChatAttachment[] = [];
  mentionVisible = false;
  mentionResults: any[] = [];
  mentionActiveIndex = 0;

  get currentUserEmpCode(): string {
    return this.authService.userData()?.CODEMPID ?? '';
  }

  get notes(): any[] {
    return this.ticket?.itNotes ?? [];
  }

  get attachmentCount(): number {
    return this.notes.reduce((total, note) => total + (note.attachments?.length ?? 0), 0);
  }

  get chatTitle(): string {
    return this.ticket?.status_user === 'Referred_Back' ? 'ข้อความจาก Approver' : 'Chat';
  }

  get showExport(): boolean {
    return this.mode === 'it-dashboard';
  }

  get showServiceHours(): boolean {
    return this.mode === 'service-list';
  }

  get hideButtonForNewTicket(): boolean {
    return this.mode === 'service-list';
  }

  isToday(value: string | Date): boolean {
    const date = new Date(value);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  getImages(files: any[] = []): any[] {
    return files.filter((file) => this.isImage(file));
  }

  getFiles(files: any[] = []): any[] {
    return files.filter((file) => !this.isImage(file));
  }

  readersForNote(note: any): TicketChatReader[] {
    const authorEmpCode = note?.createBy?.empCode;
    return this.readers.filter(
      (reader) =>
        reader.lastReadReplyId >= note.id &&
        reader.userCodeempid !== this.currentUserEmpCode &&
        reader.userCodeempid !== authorEmpCode,
    );
  }

  getFileIcon(fileName: string): string {
    const ext = fileName?.split('.').pop()?.toLowerCase() ?? '';
    const icons: Record<string, string> = {
      pdf: 'fas fa-file-pdf',
      jpg: 'fas fa-file-image',
      jpeg: 'fas fa-file-image',
      png: 'fas fa-file-image',
      gif: 'fas fa-file-image',
      doc: 'fas fa-file-word',
      docx: 'fas fa-file-word',
      xls: 'fas fa-file-excel',
      xlsx: 'fas fa-file-excel',
    };
    return icons[ext] ?? 'fas fa-file';
  }

  onImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (!image.src.includes('user.png')) image.src = 'user.png';
  }

  focusComposer(): void {
    requestAnimationFrame(() => this.chatTextarea?.nativeElement.focus());
  }

  selectEmoji(emoji: string): void {
    const textarea = this.textareaElement;
    const start = textarea?.selectionStart ?? this.message.length;
    const end = textarea?.selectionEnd ?? this.message.length;
    const nextMessage = this.message.slice(0, start) + emoji + this.message.slice(end);
    this.updateMessage(nextMessage);
    this.emojiPickerOpen = false;

    requestAnimationFrame(() => {
      this.chatTextarea?.nativeElement.focus();
      this.chatTextarea?.nativeElement.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.addFiles(input.files);
    input.value = '';
  }

  onPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;

    const files = Array.from(items)
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => !!file);

    if (!files.length) return;
    event.preventDefault();

    const dataTransfer = new DataTransfer();
    files.forEach((file) => dataTransfer.items.add(file));
    this.addFiles(dataTransfer.files);
  }

  removeAttachment(index: number): void {
    this.attachments = this.attachments.filter((_, itemIndex) => itemIndex !== index);
  }

  private addFiles(files: FileList): void {
    const errors: string[] = [];
    const validFiles: TicketChatAttachment[] = [];

    for (const file of Array.from(files)) {
      const reasons: string[] = [];
      if (this.attachments.length + validFiles.length >= TICKET_CHAT_FILE_CONFIG.maxFiles) {
        reasons.push(`เกินจำนวนสูงสุด ${TICKET_CHAT_FILE_CONFIG.maxFiles} ไฟล์`);
      }
      if (file.size / (1024 * 1024) > TICKET_CHAT_FILE_CONFIG.maxSizeMB) {
        reasons.push(`ขนาดเกิน ${TICKET_CHAT_FILE_CONFIG.maxSizeMB} MB`);
      }
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (
        !TICKET_CHAT_FILE_CONFIG.allowedTypes.includes(file.type) &&
        !TICKET_CHAT_FILE_CONFIG.allowedExtensions.includes(extension)
      ) {
        reasons.push('ประเภทไฟล์ไม่รองรับ');
      }
      if (reasons.length) errors.push(`${file.name} (${reasons.join(', ')})`);
      else validFiles.push({ name: file.name, size: file.size, file });
    }

    if (errors.length) this.swalService.warning(errors.join('\n'));
    if (validFiles.length) this.attachments = [...this.attachments, ...validFiles];
  }

  updateMessage(value: string): void {
    this.message = value;
    const match = value.match(/@([^\s@]*)$/);
    if (!match) return this.closeMention();
    this.mentionAtIndex = value.lastIndexOf('@');
    this.mentionQuery = match[1];
    this.mentionActiveIndex = 0;
    this.searchMentionEmployees(this.mentionQuery);
  }

  handleKeydown(event: KeyboardEvent): void {
    if (this.mentionVisible) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const offset = event.key === 'ArrowDown' ? 1 : -1;
        this.mentionActiveIndex = Math.max(
          0,
          Math.min(this.mentionActiveIndex + offset, this.mentionResults.length - 1),
        );
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const employee = this.mentionResults[this.mentionActiveIndex];
        if (employee) this.selectMention(employee);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeMention();
        return;
      }
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submit();
    }
  }

  submit(): void {
    const message = this.message.trim();
    if (!message || !this.ticket?.ticketId) return;
    this.submitMessage.emit({
      id: this.ticket.ticketId,
      message,
      attachments: [...this.attachments],
      mentionedAdUsers: [...this.pendingMentionAdUsers],
    });
    this.clearDraft();
  }

  clearDraft(): void {
    this.message = '';
    this.attachments = [];
    this.pendingMentionAdUsers.clear();
    this.closeMention();
  }

  selectMention(employee: any): void {
    const name = employee.Nickname || employee.nickname || employee.FullNameThai || '';
    const before = this.message.substring(0, this.mentionAtIndex);
    const after = this.message.substring(this.mentionAtIndex + 1 + this.mentionQuery.length);
    this.message = `${before}@${name} ${after}`;
    if (employee.CODEEMPID === '__all__') {
      this.getTicketParticipants().forEach((participant) => {
        const adUser = (participant.adUser || '').toLowerCase();
        if (adUser && participant.CODEEMPID !== '__all__') this.pendingMentionAdUsers.add(adUser);
      });
    } else {
      const adUser = (employee.adUser || employee.AD_USER || employee.aduser || '').toLowerCase();
      if (adUser) this.pendingMentionAdUsers.add(adUser);
    }
    this.closeMention();
    this.focusComposer();
  }

  private searchMentionEmployees(query: string): void {
    if (this.mentionDebounce) clearTimeout(this.mentionDebounce);
    const participants = this.getTicketParticipants();
    if (!query.trim() || !environment.allowMentionAnyone) {
      const normalized = query.toLowerCase();
      this.mentionResults = normalized
        ? participants.filter(
            (person) =>
              person.Nickname?.toLowerCase().includes(normalized) ||
              person.FullNameThai?.toLowerCase().includes(normalized),
          )
        : participants;
      this.mentionVisible = this.mentionResults.length > 0;
      return;
    }
    this.mentionDebounce = setTimeout(() => {
      this.itServiceService.searchEmployees({ search: query, pageSize: 8 }).subscribe({
        next: (response) => {
          this.mentionResults = (response.data || []).map((employee: any) => ({
            Nickname: employee.Nickname || employee.nickname || '',
            FullNameThai: employee.FullNameThai || employee.fullname || '',
            CODEEMPID: employee.CODEEMPID || employee.codeempid || '',
            adUser: employee.adUser || employee.aduser || '',
          }));
          this.mentionVisible = this.mentionResults.length > 0;
          this.mentionActiveIndex = 0;
        },
        error: () => this.closeMention(),
      });
    }, 200);
  }

  private getTicketParticipants(): any[] {
    const participants: any[] = [];
    const seen = new Set<string>([this.currentUserEmpCode]);
    const requester = this.ticket?.requester;
    if (requester?.emp_code && !seen.has(requester.emp_code)) {
      seen.add(requester.emp_code);
      participants.push({
        Nickname: requester.nickname || requester.fullname || '',
        FullNameThai: requester.fullname || '',
        CODEEMPID: requester.emp_code,
        adUser: this.ticket.requesterAduser || requester.aduser || '',
      });
    }
    const timeline = this.ticket?.assignTimeline ?? [];
    const latestStep = timeline.at(-1);
    for (const assignee of latestStep?.Assignee ?? []) {
      if (assignee.empCode && !seen.has(assignee.empCode)) {
        seen.add(assignee.empCode);
        participants.push({
          Nickname: assignee.nickName || assignee.fullName || '',
          FullNameThai: assignee.fullName || '',
          CODEEMPID: assignee.empCode,
          adUser: assignee.adUser || assignee.aduser || '',
        });
      }
    }
    return participants.length
      ? [{ Nickname: 'All', FullNameThai: 'แจ้งทุกคน', CODEEMPID: '__all__' }, ...participants]
      : participants;
  }

  private closeMention(): void {
    this.mentionVisible = false;
    this.mentionResults = [];
    this.mentionQuery = '';
    this.mentionAtIndex = -1;
    if (this.mentionDebounce) clearTimeout(this.mentionDebounce);
    this.mentionDebounce = null;
  }

  get textareaElement(): HTMLTextAreaElement | undefined {
    return this.chatTextarea?.nativeElement;
  }

  scrollToBottom(): void {
    requestAnimationFrame(() => {
      const element = this.cardBody?.nativeElement;
      if (element) element.scrollTop = element.scrollHeight;
    });
  }

  contains(target: EventTarget | null): boolean {
    return !!target && !!this.root?.nativeElement.contains(target as Node);
  }

  private isImage(file: any): boolean {
    const type = (file?.type ?? file?.contentType ?? '').toLowerCase();
    const name = (file?.name ?? file?.fileName ?? '').toLowerCase();
    return type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name);
  }
}
