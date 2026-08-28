import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnChanges, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalShellComponent } from '../../../../components/shared/modal-shell/modal-shell';
import { IT_ATTACHMENT_FILE_CONFIG } from '../../../../constants/it-attachment-file.constant';
import { SwalService } from '../../../../services/swal.service';

@Component({
  selector: 'app-change-ticket-type-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalShellComponent],
  templateUrl: './change-ticket-type-modal.html',
  styleUrl: './change-ticket-type-modal.scss',
})
export class ChangeTicketTypeModal implements OnChanges {
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

  selectedTypeId = 2;
  originalTypeId = 2;
  repairCostType: 'paid' | 'free' | null = null;
  originalRepairCostType: 'paid' | 'free' | null = null;
  reason = '';
  attachments: { name: string; size: number; file: File }[] = [];
  showAttachmentError = false;

  ngOnChanges(): void {
    this.selectedTypeId = Number(this.ticket?.ticketTypeId ?? this.ticket?.ticket_type_id ?? 2);
    this.originalTypeId = this.selectedTypeId;
    this.repairCostType =
      this.selectedTypeId === 1 && ['paid', 'free'].includes(this.ticket?.repair_cost_type)
        ? this.ticket.repair_cost_type
        : null;
    this.originalRepairCostType = this.repairCostType;
    this.reason = '';
    this.attachments = [];
    this.showAttachmentError = false;
  }

  selectType(ticketTypeId: number): void {
    this.selectedTypeId = ticketTypeId;
    if (ticketTypeId !== 1) {
      this.repairCostType = null;
      this.attachments = [];
      this.showAttachmentError = false;
    }
  }

  selectRepairCostType(value: 'paid' | 'free'): void {
    this.repairCostType = value;
    this.showAttachmentError = false;
    if (value !== 'paid') this.attachments = [];
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;

    const validFiles: { name: string; size: number; file: File }[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (this.attachments.length + validFiles.length >= this.fileConfig.maxFiles) {
        errors.push(`${file.name}: แนบได้สูงสุด ${this.fileConfig.maxFiles} ไฟล์`);
      } else if (file.size > this.fileConfig.maxSizeMB * 1024 * 1024) {
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

  get canSubmit(): boolean {
    const hasChanged =
      this.selectedTypeId !== this.originalTypeId ||
      (this.selectedTypeId === 1 && this.repairCostType !== this.originalRepairCostType);

    return (
      hasChanged &&
      (this.selectedTypeId !== 1 || this.repairCostType !== null)
    );
  }

  save(): void {
    if (!this.canSubmit) return;
    if (this.repairCostType === 'paid' && this.attachments.length === 0) {
      this.showAttachmentError = true;
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
