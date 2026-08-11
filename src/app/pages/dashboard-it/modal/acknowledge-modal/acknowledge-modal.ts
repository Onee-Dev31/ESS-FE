import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import {
  FilePreviewItem,
  FilePreviewModalComponent,
} from '../../../../components/modals/file-preview-modal/file-preview-modal';
import dayjs from 'dayjs';
import { SwalService } from '../../../../services/swal.service';
import { IT_ATTACHMENT_FILE_CONFIG } from '../../../../constants/it-attachment-file.constant';

@Component({
  selector: 'app-acknowledge-modal',
  imports: [CommonModule, FormsModule, FilePreviewModalComponent],
  templateUrl: './acknowledge-modal.html',
  styleUrl: './acknowledge-modal.scss',
})
export class AcknowledgeModal {
  private readonly swalService = inject(SwalService);

  @Input() ticket: any;
  @Output() submitModal = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<void>();

  selectedTag: number | null = null;
  originalTag: number | null = null;
  repairCostType: 'paid' | 'free' | null = null;

  message: string = '';
  attachments: any[] = [];
  readonly FILE_CONFIG = IT_ATTACHMENT_FILE_CONFIG;

  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['ticket'] && this.ticket) {
      this.selectedTag = this.ticket.ticketTypeId;
      this.originalTag = this.ticket.ticketTypeId;
    }
  }

  get isTagChanged(): boolean {
    return this.selectedTag !== this.originalTag;
  }

  close() {
    this.closeModal.emit();
  }

  save() {
    if (!this.selectedTag) {
      return;
    }

    const payload = {
      ticketTypeId: this.selectedTag,
      message: this.message,
      attachments: this.attachments,
      ...(this.selectedTag === 1 && { repairCostType: this.repairCostType }),
    };
    this.submitModal.emit(payload);
  }

  onTagChange(value: number) {
    this.message = '';
    this.attachments = [];
    this.repairCostType = null;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(input.files);
    }
    input.value = '';
  }

  private addFiles(files: FileList) {
    if (!files.length) return;

    const errors: string[] = [];
    const validFiles: { name: string; size: number; file: File }[] = [];

    for (const file of Array.from(files)) {
      const reasons: string[] = [];

      if (this.attachments.length + validFiles.length >= this.FILE_CONFIG.maxFiles) {
        reasons.push(`เกินจำนวนสูงสุด ${this.FILE_CONFIG.maxFiles} ไฟล์`);
      }

      if (file.size / (1024 * 1024) > this.FILE_CONFIG.maxSizeMB) {
        reasons.push(`ขนาดเกิน ${this.FILE_CONFIG.maxSizeMB} MB`);
      }

      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (
        !this.FILE_CONFIG.allowedTypes.includes(file.type) &&
        !this.FILE_CONFIG.allowedExtensions.includes(extension)
      ) {
        reasons.push('ประเภทไฟล์ไม่รองรับ');
      }

      if (reasons.length) {
        errors.push(`${file.name} (${reasons.join(', ')})`);
      } else {
        validFiles.push({ name: file.name, size: file.size, file });
      }
    }

    if (errors.length) {
      this.swalService.warning(errors.join('\n'));
    }

    this.attachments = [...this.attachments, ...validFiles];
  }

  removeAttachment(index: number) {
    this.attachments.splice(index, 1);

    if (this.attachments.length === 0) {
      this.message = '';
    }
  }

  viewFile(file: any) {
    let url = '';

    if (file.file) {
      // ไฟล์ที่ user upload
      url = URL.createObjectURL(file.file);
    } else if (file.filePath) {
      // ไฟล์จาก server
      url = file.filePath;
    }

    this.previewFiles.set([
      {
        fileName: file.name || file.fileName,
        date: dayjs().format('DD/MM/YYYY HH:mm'),
        url: url,
        type: file.file?.type || file.type || 'application/octet-stream',
      },
    ]);

    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }
}
