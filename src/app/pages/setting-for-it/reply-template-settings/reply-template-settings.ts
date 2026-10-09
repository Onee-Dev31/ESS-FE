import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwalService } from '../../../services/swal.service';
import { EmailReplyTemplateApi, ItServiceService } from '../../../services/it-service.service';
import { AuthService } from '../../../services/auth.service';
interface GuideDocumentOption {
  id: number;
  name: string;
  fileUrl: string;
  isActive: boolean;
}

@Component({
  selector: 'app-reply-template-settings',
  standalone: true,
  imports: [FormsModule, QuillModule],
  templateUrl: './reply-template-settings.html',
  styleUrl: './reply-template-settings.scss',
})
export class ReplyTemplateSettings implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly swalService = inject(SwalService);
  private readonly itServiceService = inject(ItServiceService);
  templates = signal<EmailReplyTemplateApi[]>([]);
  templatesLoading = signal(false);
  templatesError = signal(false);
  templateSearch = '';
  guideModalOpen = false;
  guideSearch = '';
  guideDocuments = signal<GuideDocumentOption[]>([]);
  guideLoading = signal(false);
  expandedTemplateId: number | null = null;
  editingTemplateId: number | null = null;
  templateTitle = '';
  templateBody = '';
  templateScope: 'GENERAL' | 'PERSONAL' = 'PERSONAL';
  templateBusy = signal(false);
  templateActionError = signal('');
  readonly templateEditorModules = {
    toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link']],
  };

  ngOnInit(): void {
    this.loadTemplates();
  }
  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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

  openGuideModal(): void {
    this.guideModalOpen = true;
    this.guideSearch = '';
    if (!this.guideDocuments().length) this.loadGuideDocuments();
  }

  closeGuideModal(): void {
    this.guideModalOpen = false;
  }

  private loadGuideDocuments(): void {
    this.guideLoading.set(true);
    this.itServiceService
      .getGuideDocuments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const rows = Array.isArray(res) ? res : (res?.data ?? []);
          this.guideDocuments.set(
            rows
              .map((item: any) => ({
                id: item.Id ?? item.id,
                name: item.Name ?? item.name,
                fileUrl: item.File_Url ?? item.fileUrl,
                isActive: item.IsActive ?? item.isActive,
              }))
              .filter((item: GuideDocumentOption) => item.isActive),
          );
          this.guideLoading.set(false);
        },
        error: () => {
          this.guideLoading.set(false);
          this.swalService.warning('โหลดเอกสารคู่มือไม่สำเร็จ');
        },
      });
  }

  get filteredGuideDocuments(): GuideDocumentOption[] {
    const query = this.guideSearch.trim().toLowerCase();
    return this.guideDocuments().filter(
      (item) => !query || `${item.name} ${item.fileUrl}`.toLowerCase().includes(query),
    );
  }

  insertGuideDocument(document: GuideDocumentOption): void {
    const name = this.escapeHtml(document.name);
    const url = this.escapeHtml(document.fileUrl);
    const linkHtml = `<p>คู่มือที่เกี่ยวข้อง: <a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a></p>`;
    this.templateBody = `${this.templateBody || ''}${linkHtml}`;
    this.closeGuideModal();
  }

  toggleTemplate(template: EmailReplyTemplateApi): void {
    if (this.templateBusy() || this.editingTemplateId !== null) return;
    this.expandedTemplateId = this.expandedTemplateId === template.Id ? null : template.Id;
    this.templateActionError.set('');
  }

  editTemplate(template: EmailReplyTemplateApi): void {
    if (this.templateBusy() || this.editingTemplateId !== null) return;
    this.expandedTemplateId = template.Id;
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
        if (first?.nodeType === Node.TEXT_NODE && /^\s*\d+\.\s/.test(first.textContent ?? ''))
          return;
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
    return (
      !!this.templateTitle.trim() &&
      (!!content.content.textContent?.trim() || !!content.content.querySelector('img'))
    );
  }

  async saveTemplate(template: EmailReplyTemplateApi): Promise<void> {
    if (this.templateBusy() || this.editingTemplateId !== template.Id || !this.validTemplateDraft)
      return;
    const result = await this.swalService.confirm(
      'ยืนยันการแก้ไขเทมเพลต?',
      `ต้องการบันทึกการเปลี่ยนแปลง “${this.templateTitle.trim()}” ใช่หรือไม่`,
      undefined,
      {
        confirmButtonText: 'บันทึก',
        focusCancel: true,
        customClass: { container: 'swal-over-modal' },
      },
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
      {
        confirmButtonText: 'เพิ่มเทมเพลต',
        focusCancel: true,
        customClass: { container: 'swal-over-modal' },
      },
    );
    if (!result.isConfirmed) return;
    this.persistTemplate(null, true);
  }

  async deleteTemplate(template: EmailReplyTemplateApi): Promise<void> {
    if (this.templateBusy() || this.editingTemplateId !== null) return;
    this.templateBusy.set(true);
    try {
      const result = await this.swalService.confirm(
        'ลบเทมเพลต?',
        `ต้องการลบ “${template.Title}” ใช่หรือไม่`,
        undefined,
        {
          confirmButtonText: 'ลบเทมเพลต',
          focusCancel: true,
          customClass: { container: 'swal-over-modal' },
        },
      );
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
    this.itServiceService
      .manageEmailReplyTemplate({
        id: template?.Id ?? 0,
        title,
        body,
        scope: isActive ? this.templateScope : template!.Scope,
        isActive,
        executeBy,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.templateBusy.set(false);
          if (res?.success === false || res?.isSuccess === false) {
            this.templateActionError.set(res?.message || 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่');
            return;
          }
          const returned = res?.data ?? res?.template;
          this.templates.update((items) =>
            template
              ? isActive
                ? items.map((item) =>
                    item.Id === template.Id
                      ? {
                          ...item,
                          Title: title,
                          Body: body,
                          Scope: this.templateScope,
                          Update_By: executeBy,
                        }
                      : item,
                  )
                : items.filter((item) => item.Id !== template.Id)
              : [
                  {
                    Id: returned?.Id ?? returned?.id ?? Date.now(),
                    Title: title,
                    Body: body,
                    Scope: this.templateScope,
                    IsActive: true,
                    Created_By: executeBy,
                    Update_By: null,
                    created_Date: new Date().toISOString(),
                    Update_Date: null,
                  },
                  ...items,
                ],
          );
          this.cancelTemplateEdit();
          if (!isActive) this.expandedTemplateId = null;
        },
        error: () => {
          this.templateBusy.set(false);
          this.templateActionError.set(
            isActive ? 'บันทึกไม่สำเร็จ กรุณาลองใหม่' : 'ลบไม่สำเร็จ กรุณาลองใหม่',
          );
        },
      });
  }
}
