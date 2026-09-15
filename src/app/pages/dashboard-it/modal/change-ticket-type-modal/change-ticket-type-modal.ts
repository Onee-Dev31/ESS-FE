import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  signal,
} from '@angular/core';
import dayjs from 'dayjs';
import { FormsModule } from '@angular/forms';
import { ModalShellComponent } from '../../../../components/shared/modal-shell/modal-shell';
import { IT_ATTACHMENT_FILE_CONFIG } from '../../../../constants/it-attachment-file.constant';
import { SwalService } from '../../../../services/swal.service';
import {
  FilePreviewItem,
  FilePreviewModalComponent,
} from '../../../../components/modals/file-preview-modal/file-preview-modal';

@Component({
  selector: 'app-change-ticket-type-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalShellComponent, FilePreviewModalComponent],
  templateUrl: './change-ticket-type-modal.html',
  styleUrl: './change-ticket-type-modal.scss',
})
export class ChangeTicketTypeModal implements OnChanges, OnDestroy {
  @Input() ticket: any;
  @Output() closeModal = new EventEmitter<void>();
  @Output() submitModal = new EventEmitter<{
    ticketTypeId: number;
    repairCostType?: 'paid' | 'free';
    reason: string;
    attachments: { name: string; size: number; file: File }[];
  }>();

  private readonly swalService = inject(SwalService);
  readonly fileConfig = IT_ATTACHMENT_FILE_CONFIG;

  readonly ticketTypes = [
    { id: 2, label: 'แจ้งปัญหา' },
    { id: 1, label: 'แจ้งซ่อม' },
    { id: 3, label: 'ขอใช้บริการ' },
  ];

  get isViaEmail(): boolean {
    return this.ticket?.viaEmail === true;
  }

  get isTypeChangeLocked(): boolean {
    const isApproved =
      String(this.ticket?.approval_status ?? this.ticket?.approvalStatus ?? '')
        .trim()
        .toLowerCase() === 'approved';
    const ticketTypeId = Number(this.ticket?.ticketTypeId ?? this.ticket?.ticket_type_id);
    const isApprovedServiceRequest = ticketTypeId === 3;
    const isApprovedPaidRepair =
      ticketTypeId === 1 &&
      String(this.ticket?.repair_cost_type ?? this.ticket?.repairCostType ?? '')
        .trim()
        .toLowerCase() === 'paid';

    return isApproved && (isApprovedServiceRequest || isApprovedPaidRepair);
  }

  get availableTicketTypes(): typeof this.ticketTypes {
    return this.isViaEmail ? this.ticketTypes : this.ticketTypes.filter((type) => type.id !== 3);
  }

  selectedTypeId = 2;
  originalTypeId = 2;
  repairCostType: 'paid' | 'free' | null = null;
  originalRepairCostType: 'paid' | 'free' | null = null;
  private lastRepairCostType: 'paid' | 'free' | null = null;
  reason = '';
  attachments: { name: string; size: number; file: File }[] = [];
  showAttachmentError = false;
  showReasonError = false;
  isPreviewModalOpen = signal(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  ngOnChanges(): void {
    this.closePreview();
    this.selectedTypeId = Number(this.ticket?.ticketTypeId ?? this.ticket?.ticket_type_id ?? 2);
    this.originalTypeId = this.selectedTypeId;
    this.repairCostType =
      this.selectedTypeId === 1 && ['paid', 'free'].includes(this.ticket?.repair_cost_type)
        ? this.ticket.repair_cost_type
        : null;
    this.originalRepairCostType = this.repairCostType;
    this.lastRepairCostType = this.repairCostType;
    this.reason = '';
    this.attachments = [];
    this.showAttachmentError = false;
    this.showReasonError = false;
  }

  selectType(ticketTypeId: number): void {
    if (this.isTypeChangeLocked || (ticketTypeId === 3 && !this.isViaEmail)) return;
    if (this.selectedTypeId === 1) {
      this.lastRepairCostType = this.repairCostType;
    }
    this.selectedTypeId = ticketTypeId;
    this.showReasonError = false;
    if (ticketTypeId !== 1) {
      this.repairCostType = null;
      this.attachments = [];
      this.showAttachmentError = false;
    } else {
      this.repairCostType = this.lastRepairCostType;
    }
  }

  selectRepairCostType(value: 'paid' | 'free'): void {
    if (this.isTypeChangeLocked) return;
    this.repairCostType = value;
    this.showAttachmentError = false;
    this.showReasonError = false;
    if (value !== 'paid') this.attachments = [];
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;

    const validFiles: { name: string; size: number; file: File }[] = [];
    const errors: string[] = [];
    let hasFileLimitError = false;

    for (const file of files) {
      if (this.attachments.length + validFiles.length >= this.fileConfig.maxFiles) {
        hasFileLimitError = true;
        continue;
      }
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (file.size > this.fileConfig.maxSizeMB * 1024 * 1024) {
        errors.push(`${file.name}: ขนาดไฟล์เกิน ${this.fileConfig.maxSizeMB} MB`);
      } else if (
        !this.fileConfig.allowedTypes.includes(file.type) &&
        !this.fileConfig.allowedExtensions.includes(extension)
      ) {
        errors.push(`${file.name}: ประเภทไฟล์ไม่รองรับ`);
      } else {
        validFiles.push({ name: file.name, size: file.size, file });
      }
    }

    this.attachments = [...this.attachments, ...validFiles];
    if (this.attachments.length) this.showAttachmentError = false;
    if (hasFileLimitError) errors.unshift(`อัปโหลดได้สูงสุด ${this.fileConfig.maxFiles} ไฟล์`);
    if (errors.length) this.swalService.warning(errors.join('\n'));
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (!files?.length) return;

    const input = { files, value: '' } as unknown as HTMLInputElement;
    this.onFileSelected({ target: input } as unknown as Event);
  }

  removeAttachment(index: number): void {
    this.attachments = this.attachments.filter((_, fileIndex) => fileIndex !== index);
  }

  previewAttachment(file: { name: string; size: number; file: File }): void {
    this.closePreview();
    this.previewFiles.set([
      {
        fileName: file.name,
        date: dayjs().format('DD/MM/YYYY HH:mm'),
        url: URL.createObjectURL(file.file),
        type: file.file.type,
      },
    ]);
    this.isPreviewModalOpen.set(true);
  }

  closePreview(): void {
    this.isPreviewModalOpen.set(false);
    for (const file of this.previewFiles()) {
      if (file.url) URL.revokeObjectURL(file.url);
    }
    this.previewFiles.set([]);
  }

  ngOnDestroy(): void {
    this.closePreview();
  }

  get hasTypeChanged(): boolean {
    return (
      this.selectedTypeId !== this.originalTypeId ||
      (this.selectedTypeId === 1 && this.repairCostType !== this.originalRepairCostType)
    );
  }

  get canSubmit(): boolean {
    if (this.isTypeChangeLocked || (this.selectedTypeId === 3 && !this.isViaEmail)) return false;

    return this.hasTypeChanged && (this.selectedTypeId !== 1 || this.repairCostType !== null);
  }

  save(): void {
    if (!this.canSubmit) return;
    if (this.repairCostType === 'paid' && this.attachments.length === 0) {
      this.showAttachmentError = true;
      return;
    }
    if (this.repairCostType === 'paid' && !this.reason.trim()) {
      this.showReasonError = true;
      return;
    }

    this.submitModal.emit({
      ticketTypeId: this.selectedTypeId,
      ...(this.selectedTypeId === 1 && { repairCostType: this.repairCostType! }),
      reason: this.reason.trim(),
      attachments: this.attachments,
    });
  }
}
