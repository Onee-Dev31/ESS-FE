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
import { QuillModule } from 'ngx-quill';
import { TextEditorComponent } from '../../../../components/shared/text-editor/text-editor';
import { SwalService } from '../../../../services/swal.service';
import { EmailReplyTemplateApi, ItServiceService } from '../../../../services/it-service.service';
import { MasterService } from '../../../../services/master.service';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../services/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';

interface CcRecipient {
  email: string;
  employeeId: string;
  nickname: string;
  nameThai: string;
  nameEnglish: string;
}

@Component({
  selector: 'app-email-reply-modal',
  standalone: true,
  imports: [TextEditorComponent, FormsModule, QuillModule],
  templateUrl: './email-reply-modal.html',
  styleUrl: './email-reply-modal.scss',
})
export class EmailReplyModal implements OnInit {
  @ViewChild(TextEditorComponent) private textEditor!: TextEditorComponent;
  @Input() ticket: any;
  @Output() submitModal = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<void>();

  message = '';
  templates = signal<EmailReplyTemplateApi[]>([]);
  templatesLoading = signal(false);
  templatesError = signal(false);
  templateSearch = '';
  templateModalOpen = false;
  expandedTemplateId: number | null = null;
  editingTemplateId: number | null = null;
  templateTitle = '';
  templateBody = '';
  templateScope: 'GENERAL' | 'PERSONAL' = 'PERSONAL';
  templateBusy = signal(false);
  templateActionError = signal('');
  readonly templateEditorModules = { toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link']] };
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  quotedMessage = '';
  isSubmitting = signal(false);
  isConfirming = signal(false);

  to = '';
  canEditTo = false;
  cc: string[] = [];
  ccInput = '';
  employees = signal<CcRecipient[]>([]);
  ccSuggestionsOpen = false;
  activeCcIndex = 0;
  readonly employeeImageUrl = environment.employeeImageUrl;

  onEmployeeImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (!image.src.endsWith('/user.png')) image.src = 'user.png';
  }

  private readonly swalService = inject(SwalService);
  private readonly itServiceService = inject(ItServiceService);
  private readonly masterService = inject(MasterService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly replyNotice =
    'หากท่านมีคำถามหรือข้อมูลเพิ่มเติมเกี่ยวกับปัญหาดังกล่าว สามารถตอบกลับอีเมลนี้ได้ทันที';

  ngOnInit(): void {
    this.loadTemplates();
    this.loadRecipients();
    this.loadEmployees();
    const originalDescription = this.ticket?.description ?? '';
    if (!originalDescription) {
      this.message = '';
      this.quotedMessage = '';
      return;
    }
    const description = this.removePreviousReplyNotices(originalDescription);

    // const senderName = this.escapeHtml(String(this.ticket?.requesterName || 'ผู้ส่ง'));
    // const senderEmail = this.ticket?.requesterEmail
    //   ? ` &lt;${this.escapeHtml(String(this.ticket.requesterEmail))}&gt;`
    //   : '';
    // const sentAt = this.ticket?.createdDate ? new Date(this.ticket.createdDate) : null;
    const hasEmailMessage = this.ticket?.hasEmailMessage === true;

    const senderNameValue = hasEmailMessage
      ? this.ticket?.lastEmailSenderName
      : this.ticket?.requesterName;

    const senderEmailValue = hasEmailMessage
      ? this.ticket?.lastEmailSender
      : this.ticket?.requesterEmail;

    const sentAtValue = hasEmailMessage
      ? this.ticket?.lastEmailReceivedAt
      : this.ticket?.createdDate;
    const senderName = senderNameValue ? this.escapeHtml(String(senderNameValue)) : '';

    const senderEmail = senderEmailValue
      ? ` &lt;${this.escapeHtml(String(senderEmailValue))}&gt;`
      : '';

    const senderDisplay = senderName ? `${senderName}${senderEmail}` : senderEmail || 'ผู้ส่ง';

    const sentAt = sentAtValue ? new Date(sentAtValue) : null;

    let datePrefix = '';

    if (sentAt && !Number.isNaN(sentAt.getTime())) {
      const date = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Bangkok',
      }).format(sentAt);

      const time = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone: 'Asia/Bangkok',
      }).format(sentAt);

      datePrefix = `On ${date} at ${time}, `;
    }

    const originalHeader = `
    <p>
      ${datePrefix}${senderDisplay} เขียนว่า:
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

  loadTemplates(): void {
    this.templatesLoading.set(true);
    this.templatesError.set(false);

    const codeEmpId = String(this.authService.userData()?.CODEMPID ?? '');

    this.itServiceService
      .getEmailReplyTemplates(codeEmpId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          console.log('getEmailReplyTemplates', res);
          const templates = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

          this.templates.set(templates);
          this.templatesLoading.set(false);
        },

        error: (error) => {
          console.error('getEmailReplyTemplates error', error);

          this.templates.set([]);
          this.templatesError.set(true);
          this.templatesLoading.set(false);
        },
      });
  }

  get filteredTemplates(): EmailReplyTemplateApi[] {
    const query = this.templateSearch.trim().toLowerCase();

    return this.templates().filter((item) =>
      `${item.Title} ${item.Body}`.toLowerCase().includes(query),
    );
  }

  private loadRecipients(): void {
    const viaEmail =
      this.ticket?.viaEmail === true ||
      this.ticket?.viaEmail === 1 ||
      this.ticket?.viaEmail === '1' ||
      this.ticket?.viaEmail === 'true';

    if (!viaEmail) {
      this.to = String(this.ticket?.requester?.email ?? '').trim();
      if (this.to === 'ไม่ระบุอีเมล') this.to = '';
      this.canEditTo = !this.to;
      if (!this.to) {
        this.swalService.warning(
          'Requester ไม่มี email',
          'ไม่พบอีเมลของผู้ขอใช้บริการ กรุณากรอกอีเมลในช่อง “ถึง” ก่อนส่งข้อความ',
        );
      }
      const ccList = Array.isArray(this.ticket?.ccList) ? this.ticket.ccList : [];
      const emails = ccList
        .map((cc: any) =>
          String(typeof cc === 'string' ? cc : (cc?.email ?? cc?.EMAIL ?? '')).trim(),
        )
        .filter((email: string) => this.isValidEmail(email));
      this.cc = [
        ...new Map<string, string>(
          emails.map((email: string): [string, string] => [email.toLowerCase(), email]),
        ).values(),
      ];
      return;
    }

    const ticketId = this.ticket?.ticketId;
    if (!ticketId) return;

    this.itServiceService.getReplyEmailRecipients(ticketId).subscribe({
      next: (res) => {
        this.to = String(res?.to ?? '').trim();
        if (this.to === 'ไม่ระบุอีเมล') this.to = '';
        this.canEditTo = !this.to;
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

  private loadEmployees(): void {
    const params = {
      pageNumber: 1,
      pageSize: 2000,
    };

    this.masterService.getEmployees(params).subscribe({
      next: (res: any) => {
        const items = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        const recipients = items.map((employee: any): CcRecipient => ({
          email: String(employee.Email ?? '').trim(),
          employeeId: String(employee.EmployeeID ?? '').trim(),
          nickname: String(employee.Nickname ?? '').trim(),
          nameThai:
            String(employee.FullName ?? employee.NameThai ?? '').trim() ||
            `${employee.FirstNameT ?? ''} ${employee.LastNameT ?? ''}`.trim(),
          nameEnglish:
            `${employee.FirstName ?? ''} ${employee.LastName ?? ''}`.trim() ||
            String(employee.NameEng ?? '').trim(),
        }));
        const unique = new Map<string, CcRecipient>();
        for (const recipient of recipients) {
          if (this.isValidEmail(recipient.email)) {
            unique.set(recipient.email.toLowerCase(), recipient);
          }
        }
        this.employees.set([...unique.values()]);
      },
      error: () => {
        this.employees.set([]);
      },
    });
  }

  get ccSuggestions(): CcRecipient[] {
    const keyword = this.ccInput.trim().toLowerCase();
    if (!keyword) return [];
    const selected = new Set(this.cc.map((email) => email.toLowerCase()));
    return this.employees()
      .filter(
        (employee) =>
          !selected.has(employee.email.toLowerCase()) &&
          [
            employee.email,
            employee.nameThai,
            employee.nameEnglish,
            employee.nickname,
            employee.employeeId,
          ].some((value) => value.toLowerCase().includes(keyword)),
      )
      .slice(0, 10);
  }

  onCcInputChange(): void {
    this.activeCcIndex = 0;
    this.ccSuggestionsOpen = true;
  }

  selectCcRecipient(recipient: CcRecipient): void {
    this.ccInput = recipient.email;
    this.addCcTag();
    this.ccSuggestionsOpen = false;
    this.activeCcIndex = 0;
  }

  onCcBlur(): void {
    this.ccSuggestionsOpen = false;
    this.addCcTag();
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email);
  }

  addCcTag(): void {
    const value = this.ccInput.trim().replace(/,$/, '');
    if (!value || !this.isValidEmail(value)) return;
    this.ccInput = '';
    if (this.cc.some((email) => email.toLowerCase() === value.toLowerCase())) return;

    this.cc.push(value);
  }

  removeCcTag(index: number): void {
    this.cc.splice(index, 1);
  }

  onCcInputKeydown(event: KeyboardEvent): void {
    if (event.isComposing) return;
    if (event.key === 'Backspace' && this.ccInput === '' && this.cc.length > 0) {
      event.preventDefault();
      if (!event.repeat) this.removeCcTag(this.cc.length - 1);
      return;
    }
    const suggestions = this.ccSuggestions;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!suggestions.length) return;
      if (!this.ccSuggestionsOpen) {
        this.activeCcIndex = 0;
      } else {
        const step = event.key === 'ArrowDown' ? 1 : -1;
        this.activeCcIndex = (this.activeCcIndex + step + suggestions.length) % suggestions.length;
      }
      this.ccSuggestionsOpen = true;
    } else if (event.key === 'Escape') {
      this.ccSuggestionsOpen = false;
    } else if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      if (
        event.key === 'Enter' &&
        this.ccSuggestionsOpen &&
        suggestions.length &&
        !this.isValidEmail(this.ccInput.trim())
      ) {
        this.selectCcRecipient(suggestions[this.activeCcIndex] ?? suggestions[0]);
      } else {
        this.addCcTag();
      }
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

  selectTemplate(template: EmailReplyTemplateApi): void {
    if (this.isSubmitting() || this.isConfirming() || this.templateBusy() || this.editingTemplateId !== null) {
      return;
    }

    const inserted = this.textEditor?.appendHtml(template.Body);

    if (!inserted) {
      return;
    }

    this.closeTemplateModal();
  }

  openTemplateModal(): void {
    this.templateModalOpen = true;
    this.templateSearch = '';
  }

  closeTemplateModal(): void {
    if (this.templateBusy() || this.editingTemplateId !== null) return;
    this.templateModalOpen = false;
    this.expandedTemplateId = null;
    this.templateActionError.set('');
  }

  toggleTemplate(template: EmailReplyTemplateApi): void {
    if (this.templateBusy() || this.editingTemplateId !== null) return;
    this.expandedTemplateId = this.expandedTemplateId === template.Id ? null : template.Id;
    this.templateActionError.set('');
  }

  editTemplate(template: EmailReplyTemplateApi): void {
    if (this.templateBusy()) return;
    this.editingTemplateId = template.Id;
    this.templateTitle = template.Title;
    this.templateBody = this.normalizeTemplateHtml(template.Body, false);
    this.templateScope = template.Scope;
    this.templateActionError.set('');
  }

  normalizeTemplateHtml(value: string | null | undefined, addListNumbers = true): string {
    const html = String(value ?? '')
      .replace(/\\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
      .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
      // Keep blank paragraphs visible in the preview, matching Quill's <p><br></p> spacing.
      .replace(/<p>\s*(?:<br\s*\/?>)?\s*<\/p>/gi, '<p>&nbsp;</p>');

    if (!addListNumbers) return html;
    const template = document.createElement('template');
    template.innerHTML = html;
    template.content.querySelectorAll('ol').forEach((list) => {
      Array.from(list.children).forEach((item, index) => {
        if (item.tagName.toLowerCase() !== 'li') return;
        const first = item.firstChild;
        if (first?.nodeType === Node.TEXT_NODE && /^\s*\d+\.\s/.test(first.textContent ?? '')) return;
        item.insertBefore(document.createTextNode(`${index + 1}. `), first ?? null);
      });
    });
    template.content.querySelectorAll('ul').forEach((list) => {
      Array.from(list.children).forEach((item) => {
        if (item.tagName.toLowerCase() !== 'li') return;
        const first = item.firstChild;
        if (first?.nodeType === Node.TEXT_NODE && /^\s*•\s/.test(first.textContent ?? '')) return;
        item.insertBefore(document.createTextNode('• '), first ?? null);
      });
    });
    return template.innerHTML;
  }

  cancelTemplateEdit(): void {
    if (this.templateBusy()) return;
    this.editingTemplateId = null;
    this.templateTitle = '';
    this.templateBody = '';
    this.templateScope = 'PERSONAL';
    this.templateActionError.set('');
  }

  addTemplate(): void {
    if (this.templateBusy() || this.editingTemplateId !== null) return;
    this.expandedTemplateId = null;
    this.editingTemplateId = 0;
    this.templateTitle = '';
    this.templateBody = '';
    this.templateScope = 'PERSONAL';
    this.templateActionError.set('');
  }

  get validTemplateDraft(): boolean {
    const content = document.createElement('template');
    content.innerHTML = this.templateBody || '';
    return !!this.templateTitle.trim() &&
      (!!content.content.textContent?.trim() || !!content.content.querySelector('img'));
  }

  async saveTemplate(template: EmailReplyTemplateApi): Promise<void> {
    if (this.templateBusy() || this.editingTemplateId !== template.Id || !this.validTemplateDraft) return;
    const result = await this.swalService.confirm(
      'ยืนยันการแก้ไขเทมเพลต?',
      `ต้องการบันทึกการเปลี่ยนแปลง “${this.templateTitle.trim()}” ใช่หรือไม่`,
      undefined,
      { confirmButtonText: 'บันทึก', focusCancel: true, customClass: { container: 'swal-over-modal' } },
    );
    if (!result.isConfirmed) return;
    this.persistTemplate(template, true);
  }

  async saveNewTemplate(): Promise<void> {
    if (this.templateBusy() || this.editingTemplateId !== 0 || !this.validTemplateDraft) return;
    const result = await this.swalService.confirm(
      'ยืนยันการเพิ่มเทมเพลต?',
      `ต้องการเพิ่ม “${this.templateTitle.trim()}” ใช่หรือไม่`,
      undefined,
      { confirmButtonText: 'เพิ่มเทมเพลต', focusCancel: true, customClass: { container: 'swal-over-modal' } },
    );
    if (!result.isConfirmed) return;
    this.persistTemplate(null, true);
  }

  async deleteTemplate(template: EmailReplyTemplateApi): Promise<void> {
    if (this.templateBusy() || this.editingTemplateId !== null) return;
    this.templateBusy.set(true);
    try {
      const result = await this.swalService.confirm('ลบเทมเพลต?', `ต้องการลบ “${template.Title}” ใช่หรือไม่`, undefined,
        { confirmButtonText: 'ลบเทมเพลต', focusCancel: true, customClass: { container: 'swal-over-modal' } });
      if (!result.isConfirmed) return;
    } catch {
      return;
    } finally {
      this.templateBusy.set(false);
    }
    this.persistTemplate(template, false);
  }

  private persistTemplate(template: EmailReplyTemplateApi | null, isActive: boolean): void {
    const executeBy = String(this.authService.userData()?.CODEMPID ?? '');
    if (!executeBy) {
      this.templateActionError.set('ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่');
      return;
    }
    const title = isActive ? this.templateTitle.trim() : template!.Title;
    const body = isActive ? this.templateBody : template!.Body;
    this.templateBusy.set(true);
    this.templateActionError.set('');
    this.itServiceService.manageEmailReplyTemplate({
      id: template?.Id ?? 0, title, body,
      scope: this.templateScope,
      isActive, executeBy,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.templateBusy.set(false);
        if (res?.success === false || res?.isSuccess === false) {
          this.templateActionError.set(res?.message || 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่');
          return;
        }
        const returned = res?.data ?? res?.template;
        this.templates.update(items => template
          ? (isActive ? items.map(item => item.Id === template.Id ? { ...item, Title: title, Body: body, Scope: this.templateScope, Update_By: this.templateScope === 'GENERAL' ? executeBy : item.Update_By } : item) : items.filter(item => item.Id !== template.Id))
          : [{ Id: returned?.Id ?? returned?.id ?? Date.now(), Title: title, Body: body, Scope: this.templateScope, IsActive: true, Created_By: executeBy, Update_By: null, created_Date: new Date().toISOString(), Update_Date: null }, ...items]);
        this.cancelTemplateEdit();
        if (!isActive) this.expandedTemplateId = null;
      },
      error: () => {
        this.templateBusy.set(false);
        this.templateActionError.set(isActive ? 'บันทึกไม่สำเร็จ กรุณาลองใหม่' : 'ลบไม่สำเร็จ กรุณาลองใหม่');
      },
    });
  }

  onMessageChange(value: string | null): void {
    this.message = value ?? '';
  }

  close(): void {
    this.textEditor?.clearImages();
    this.closeModal.emit();
  }

  async submit(): Promise<void> {
    if (!this.hasMessage || !this.ticket?.ticketId || this.isSubmitting() || this.isConfirming())
      return;

    this.to = this.to.trim();
    if (!this.isValidEmail(this.to)) {
      this.swalService.warning(
        'กรุณาตรวจสอบอีเมลผู้รับ',
        'กรุณากรอกอีเมลในช่อง “ถึง” ให้ถูกต้องก่อนส่งข้อความ',
      );
      return;
    }

    this.addCcTag();
    if (this.ccInput.trim()) {
      this.swalService.warning('กรุณาตรวจสอบ Cc', 'กรุณาเลือกพนักงานหรือกรอกอีเมลให้ครบก่อนส่ง');
      return;
    }

    this.isConfirming.set(true);
    try {
      const result = await this.swalService.confirm(
        'ยืนยันการส่งอีเมล',
        undefined,
        `<div class="email-confirm-content">
          <p class="email-confirm-intro">ตรวจสอบรายชื่อผู้รับให้ครบก่อนส่งข้อความ</p>
          <div class="email-confirm-recipients">
            <div class="email-confirm-group">
              <div class="email-confirm-label"><i class="fa-regular fa-envelope" aria-hidden="true"></i> ถึง <span>ผู้รับหลัก</span></div>
              <div class="email-confirm-chips"><span class="email-confirm-chip">${this.escapeHtml(this.to)}</span></div>
            </div>
            <div class="email-confirm-group">
              <div class="email-confirm-label"><i class="fa-solid fa-user-group" aria-hidden="true"></i> Cc <span>${this.cc.length} รายการ</span></div>
              <div class="email-confirm-chips">${this.cc.length ? this.cc.map((email) => `<span class="email-confirm-chip">${this.escapeHtml(email)}</span>`).join('') : '<span class="email-confirm-empty">ไม่มีผู้รับสำเนา</span>'}</div>
            </div>
          </div>
          <p class="email-confirm-note"><i class="fa-regular fa-circle-check" aria-hidden="true"></i> เมื่อข้อมูลถูกต้อง กด “ยืนยันส่งอีเมล” เพื่อดำเนินการ</p>
        </div>`,
        {
          confirmButtonText: 'ยืนยันส่งอีเมล',
          reverseButtons: true,
          focusCancel: true,
          iconHtml: '<i class="fa-regular fa-paper-plane" aria-hidden="true"></i>',
          customClass: { popup: 'email-confirm-popup' },
        },
      );
      if (!result.isConfirmed) return;
    } finally {
      this.isConfirming.set(false);
    }

    this.isSubmitting.set(true);
    this.textEditor.confirmImages().subscribe({
      next: (replyMessage) => {
        const fullMessage =
          replyMessage +
          `<hr style="border:0;border-top:1px solid #dadce0;margin:16px 0;"/>` +
          this.quotedMessage;

        const payload = {
          id: this.ticket.ticketId,
          message: fullMessage,
          to: this.to ? [this.to] : [],
          cc: this.cc,
          attachments: [],
        };

        // console.log('submit email reply', payload);

        this.submitModal.emit(payload);
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
