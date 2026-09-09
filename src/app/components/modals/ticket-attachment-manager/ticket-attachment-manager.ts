import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { ModalShellComponent } from '../../shared/modal-shell/modal-shell';
import { SwalService } from '../../../services/swal.service';
import { IT_ATTACHMENT_FILE_CONFIG } from '../../../constants/it-attachment-file.constant';

@Component({
  selector: 'app-ticket-attachment-manager',
  standalone: true,
  imports: [CommonModule, ModalShellComponent],
  templateUrl: './ticket-attachment-manager.html',
  styleUrl: './ticket-attachment-manager.scss',
})
export class TicketAttachmentManagerComponent {
  readonly fileConfig = IT_ATTACHMENT_FILE_CONFIG;
  readonly maxUserFiles = this.fileConfig.maxFiles;
  private swalService = inject(SwalService);
  @Input() userFiles: any[] = [];
  @Input() itFiles: any[] = [];
  @Input() canAddUserFiles = false;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSaveFiles = new EventEmitter<{ files: File[]; removedFiles: any[] }>();
  @Output() onViewFile = new EventEmitter<any>();
  @Output() onRemoveNewFile = new EventEmitter<any>();

  activeSource: 'user' | 'it' = 'user';
  pendingFiles: File[] = [];
  pendingRemovedFiles: any[] = [];

  get files(): any[] {
    if (this.activeSource === 'it') return this.itFiles;
    return [
      ...this.userFiles.filter((file) => !this.pendingRemovedFiles.includes(file)),
      ...this.pendingFiles.map((file) => ({ name: file.name, file, isNew: true, pending: true })),
    ];
  }

  get userFileCount(): number {
    return (
      this.userFiles.filter((file) => !this.pendingRemovedFiles.includes(file)).length +
      this.pendingFiles.length
    );
  }

  get remainingUserFileSlots(): number {
    return Math.max(0, this.maxUserFiles - this.userFileCount);
  }

  get canAddMoreUserFiles(): boolean {
    return this.remainingUserFileSlots > 0;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;

    const validFiles: File[] = [];
    const errors: string[] = [];
    for (const file of files) {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      const isAllowedType =
        this.fileConfig.allowedTypes.includes(file.type) ||
        this.fileConfig.allowedExtensions.includes(extension);
      const isTooLarge = file.size > this.fileConfig.maxSizeMB * 1024 * 1024;

      if (!isAllowedType) {
        errors.push(`${file.name} (ประเภทไฟล์ไม่รองรับ)`);
      } else if (isTooLarge) {
        errors.push(`${file.name} (ขนาดเกิน ${this.fileConfig.maxSizeMB} MB)`);
      } else {
        validFiles.push(file);
      }
    }

    if (errors.length) {
      this.swalService.warning(errors.join('\n'));
    }

    if (!validFiles.length) {
      input.value = '';
      return;
    }

    if (!this.canAddMoreUserFiles) {
      this.swalService.warning(`แนบไฟล์ได้สูงสุด ${this.maxUserFiles} ไฟล์ (รวมไฟล์เดิม)`);
      input.value = '';
      return;
    }

    const allowedFiles = validFiles.slice(0, this.remainingUserFileSlots);
    if (validFiles.length > allowedFiles.length) {
      this.swalService.warning(
        `แนบไฟล์ได้สูงสุด ${this.maxUserFiles} ไฟล์ (รวมไฟล์เดิม)`,
        `เพิ่มได้อีก ${this.remainingUserFileSlots} ไฟล์`,
      );
    }
    this.pendingFiles = [...this.pendingFiles, ...allowedFiles];
    input.value = '';
  }

  removeNewFile(file: any): void {
    if (file.pending) {
      this.pendingFiles = this.pendingFiles.filter((pending) => pending !== file.file);
      return;
    }
    this.pendingRemovedFiles = [...this.pendingRemovedFiles, file];
  }

  saveFiles(): void {
    this.onSaveFiles.emit({ files: this.pendingFiles, removedFiles: this.pendingRemovedFiles });
  }

  fileName(file: any): string {
    return file?.name ?? file?.fileName ?? file?.file_name ?? 'Unknown file';
  }
}
