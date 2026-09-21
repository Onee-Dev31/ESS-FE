import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ItServiceService, ManageGuideDocumentPayload } from '../../services/it-service.service';
import { SwalService } from '../../services/swal.service';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';

interface GuideDocument {
  id: number;
  name: string;
  fileUrl: string;
  filePath: string;
  isActive: boolean;
}

@Component({
  selector: 'app-setting-guide-document',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent],
  templateUrl: './setting-guide-document.html',
  styleUrl: './setting-guide-document.scss',
})
export class SettingGuideDocument implements OnInit {
  @Input() asPage = true;
  @Output() closeModal = new EventEmitter<void>();
  private readonly api = inject(ItServiceService);
  private readonly auth = inject(AuthService);
  private readonly swal = inject(SwalService);
  documents = signal<GuideDocument[]>([]);
  loading = signal(false);
  saving = signal(false);
  editingId: number | null = null;
  name = '';
  fileUrl = '';
  filePath = '';
  isActive = true;
  search = '';

  ngOnInit(): void {
    this.load();
  }
  load(): void {
    this.loading.set(true);
    this.api.getGuideDocuments().subscribe({
      next: (res) => {
        const data = Array.isArray(res) ? res : (res?.data ?? []);
        // console.log('Guide documents loaded:', data);
        this.documents.set(
          data.map((item: any) => ({
            id: item.Id ?? item.id,
            name: item.Name ?? item.name,
            fileUrl: item.File_Url ?? item.fileUrl,
            filePath: item.File_Path ?? item.filePath,
            isActive: item.IsActive ?? item.isActive,
          })),
        );
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.swal.warning('โหลดเอกสารไม่สำเร็จ');
      },
    });
  }
  get filtered(): GuideDocument[] {
    const q = this.search.trim().toLowerCase();
    return this.documents().filter((d) => !q || `${d.name} ${d.fileUrl}`.toLowerCase().includes(q));
  }
  add(): void {
    this.editingId = 0;
    this.name = '';
    this.fileUrl = '';
    this.filePath = '';
    this.isActive = true;
  }
  edit(doc: GuideDocument): void {
    this.editingId = doc.id;
    this.name = doc.name;
    this.fileUrl = doc.fileUrl;
    this.filePath = doc.filePath;
    this.isActive = doc.isActive;
  }
  cancel(): void {
    this.editingId = null;
  }
  async save(): Promise<void> {
    if (!this.name.trim() || !this.fileUrl.trim() || this.saving()) return;
    const result = await this.swal.confirm(
      this.editingId ? 'ยืนยันการแก้ไขเอกสาร?' : 'ยืนยันการเพิ่มเอกสาร?',
      undefined,
      undefined,
      { confirmButtonText: 'ยืนยัน', focusCancel: true },
    );
    if (!result.isConfirmed) return;
    const payload: ManageGuideDocumentPayload = {
      id: this.editingId ?? 0,
      name: this.name.trim(),
      fileUrl: this.fileUrl.trim(),
      filePath: (this.filePath || this.fileUrl).trim(),
      isActive: this.isActive,
      executeBy: String(this.auth.userData()?.CODEMPID ?? ''),
    };
    this.saving.set(true);
    const { id: _id, ...createPayload } = payload;
    const request =
      this.editingId === 0
        ? this.api.createGuideDocument(createPayload)
        : this.api.manageGuideDocument(payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editingId = null;
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.swal.warning('บันทึกเอกสารไม่สำเร็จ');
      },
    });
  }
  async remove(doc: GuideDocument): Promise<void> {
    const result = await this.swal.confirm('ยืนยันการลบเอกสาร?', doc.name, undefined, {
      confirmButtonText: 'ลบ',
      focusCancel: true,
    });
    if (!result.isConfirmed) return;
    const payload: ManageGuideDocumentPayload = {
      id: doc.id,
      name: doc.name,
      fileUrl: doc.fileUrl,
      filePath: doc.filePath,
      isActive: false,
      executeBy: String(this.auth.userData()?.CODEMPID ?? ''),
    };
    this.api
      .manageGuideDocument(payload)
      .subscribe({ next: () => this.load(), error: () => this.swal.warning('ลบเอกสารไม่สำเร็จ') });
  }
  close(): void {
    this.closeModal.emit();
  }
}
