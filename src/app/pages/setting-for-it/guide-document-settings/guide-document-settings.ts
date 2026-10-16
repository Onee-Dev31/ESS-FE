import { DatePipe } from '@angular/common';
import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { ItServiceService, ManageGuideDocumentPayload } from '../../../services/it-service.service';
import { SwalService } from '../../../services/swal.service';

interface GuideDocument {
  id: number;
  name: string;
  description: string;
  fileUrl: string;
  filePath: string;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  createdDate: string | null;
  updatedDate: string | null;
  likeCount: number;
  unlikeCount: number;
  countView: number;
  reaction: 'LIKE' | 'UNLIKE' | null;
}

@Component({
  selector: 'app-guide-document-settings',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './guide-document-settings.html',
  styleUrl: './guide-document-settings.scss',
})
export class GuideDocumentSettings implements OnInit {
  @Input() readOnly = false;
  private readonly itServiceService = inject(ItServiceService);
  private readonly auth = inject(AuthService);
  private readonly swal = inject(SwalService);
  documents = signal<GuideDocument[]>([]);
  loading = signal(false);
  saving = signal(false);
  reactingIds = signal<Set<number>>(new Set());
  editingId: number | null = null;
  name = '';
  description = '';
  fileUrl = '';
  filePath = '';
  isActive = true;
  search = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const empCode = this.readOnly ? this.auth.userData()?.CODEMPID : undefined;
    this.itServiceService.getGuideDocuments(empCode).subscribe({
      next: (res) => {
        const data = Array.isArray(res) ? res : (res?.data ?? []);
        const visibleData = this.readOnly
          ? data.filter((item: any) => item.IsActive === true)
          : data;
        this.documents.set(
          visibleData.map((item: any) => ({
            id: item.Id ?? item.id,
            name: item.Name ?? item.name,
            description: String(item.Description ?? item.description ?? '').trim(),
            fileUrl: item.File_Url ?? item.fileUrl,
            filePath: item.File_Path ?? item.filePath,
            isActive: item.IsActive ?? item.isActive,
            createdBy: String(item.Created_by ?? '').trim(),
            updatedBy: String(item.Update_by ?? '').trim(),
            createdDate:
              item.Created_Date ??
              item.created_Date ??
              item.createdDate ??
              item.CreatedDate ??
              null,
            updatedDate:
              item.Update_Date ?? item.updated_Date ?? item.updatedDate ?? item.UpdatedDate ?? null,
            likeCount: Number(item.LikeCount ?? 0),
            unlikeCount: Number(item.UnlikeCount ?? 0),
            countView: Number(item.CountView ?? 0),
            reaction: this.normalizeReaction(item.MyReaction),
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

  react(doc: GuideDocument, reaction: 'LIKE' | 'UNLIKE'): void {
    const codeEmpId = String(this.auth.userData()?.CODEMPID ?? '').trim();
    if (!codeEmpId || this.reactingIds().has(doc.id)) return;

    const nextReaction = doc.reaction === reaction ? null : reaction;
    this.reactingIds.update((ids) => new Set(ids).add(doc.id));
    this.itServiceService
      .reactGuideDocument({ guideDocId: doc.id, codeEmpId, reaction: nextReaction })
      .subscribe({
        next: () => {
          this.updateReaction(doc.id, doc.reaction, nextReaction);
          this.finishReacting(doc.id);
        },
        error: () => {
          this.finishReacting(doc.id);
          this.swal.warning('บันทึกความคิดเห็นไม่สำเร็จ');
        },
      });
  }

  private updateReaction(
    id: number,
    previous: 'LIKE' | 'UNLIKE' | null,
    next: 'LIKE' | 'UNLIKE' | null,
  ): void {
    this.documents.update((documents) =>
      documents.map((doc) =>
        doc.id !== id
          ? doc
          : {
              ...doc,
              likeCount: Math.max(
                0,
                doc.likeCount - (previous === 'LIKE' ? 1 : 0) + (next === 'LIKE' ? 1 : 0),
              ),
              unlikeCount: Math.max(
                0,
                doc.unlikeCount - (previous === 'UNLIKE' ? 1 : 0) + (next === 'UNLIKE' ? 1 : 0),
              ),
              reaction: next,
            },
      ),
    );
  }

  private finishReacting(id: number): void {
    this.reactingIds.update((ids) => {
      const next = new Set(ids);
      next.delete(id);
      return next;
    });
  }

  private normalizeReaction(value: unknown): 'LIKE' | 'UNLIKE' | null {
    const reaction = String(value ?? '').toUpperCase();
    // console.log('Normalizing reaction:', value, '->', reaction);
    return reaction === 'LIKE' || reaction === 'UNLIKE' ? reaction : null;
  }

  viewGuideDocument(id: number): void {
    if (!this.readOnly) return;

    // เปิด comment เมื่อยกเว้น role IT Staff กับ Systems Admin
    // const roles = (this.auth.userRole() ?? '').split(',').map((role) => role.trim().toLowerCase());
    // const rolesWithoutViewCount = ['it-staff', 'system-admin'];
    // if (roles.some((role) => rolesWithoutViewCount.includes(role))) return;

    this.itServiceService.viewGuideDocument(id).subscribe({
      next: () => {
        this.documents.update((documents) =>
          documents.map((doc) => (doc.id === id ? { ...doc, countView: doc.countView + 1 } : doc)),
        );
      },
    });
  }

  get filtered(): GuideDocument[] {
    const q = this.search.trim().toLowerCase();
    return this.documents().filter(
      (d) => !q || `${d.name} ${d.description} ${d.fileUrl}`.toLowerCase().includes(q),
    );
  }
  add(): void {
    if (this.readOnly) return;
    this.editingId = 0;
    this.name = '';
    this.description = '';
    this.fileUrl = '';
    this.filePath = '';
    this.isActive = true;
  }
  edit(doc: GuideDocument): void {
    if (this.readOnly) return;
    this.editingId = doc.id;
    this.name = doc.name;
    this.description = doc.description;
    this.fileUrl = doc.fileUrl;
    this.filePath = doc.filePath;
    this.isActive = doc.isActive;
  }
  cancel(): void {
    this.editingId = null;
  }
  async save(): Promise<void> {
    if (this.readOnly) return;
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
      description: this.description.trim(),
      fileUrl: this.fileUrl.trim(),
      filePath: (this.filePath || this.fileUrl).trim(),
      isActive: this.isActive,
      executeBy: String(this.auth.userData()?.CODEMPID ?? ''),
    };
    this.saving.set(true);
    const { id: _id, ...createPayload } = payload;
    const request =
      this.editingId === 0
        ? this.itServiceService.createGuideDocument(createPayload)
        : this.itServiceService.manageGuideDocument(payload);
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
    if (this.readOnly) return;
    const result = await this.swal.confirm('ยืนยันการลบเอกสาร?', doc.name, undefined, {
      confirmButtonText: 'ลบ',
      focusCancel: true,
    });
    if (!result.isConfirmed) return;
    const payload: ManageGuideDocumentPayload = {
      id: doc.id,
      name: doc.name,
      description: doc.description,
      fileUrl: doc.fileUrl,
      filePath: doc.filePath,
      isActive: false,
      executeBy: String(this.auth.userData()?.CODEMPID ?? ''),
    };
    this.itServiceService
      .manageGuideDocument(payload)
      .subscribe({ next: () => this.load(), error: () => this.swal.warning('ลบเอกสารไม่สำเร็จ') });
  }
}
