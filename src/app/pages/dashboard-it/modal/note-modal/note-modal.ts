import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import {
  FilePreviewItem,
  FilePreviewModalComponent,
} from '../../../../components/modals/file-preview-modal/file-preview-modal';
import dayjs from 'dayjs';
import { FormsModule } from '@angular/forms';
import { SwalService } from '../../../../services/swal.service';

@Component({
  selector: 'app-note-modal',
  imports: [FilePreviewModalComponent, FormsModule],
  templateUrl: './note-modal.html',
  styleUrl: './note-modal.scss',
})
export class NoteModal {
  @Input() ticket: any;
  @Output() submitModal = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<void>();

  private swalService = inject(SwalService);

  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  noteForm = {
    message: '',
    attachments: [] as any[],
  };

  readonly FILE_CONFIG = {
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

  close() {
    this.closeModal.emit();
  }

  save() {
    const payload = {
      id: this.ticket.ticketId,
      message: this.noteForm.message,
      attachments: this.noteForm.attachments,
    };
    this.submitModal.emit(payload);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      this.addFiles(event.dataTransfer.files);
    }
  }

  onFileSelected(event: any) {
    const files: FileList = event.target.files;
    this.addFiles(files);
    event.target.value = '';
  }

  private addFiles(files: FileList) {
    if (!files || files.length === 0) return;

    const current = this.noteForm.attachments;
    const errors: string[] = [];
    const validFiles: { name: string; size: number; file: File }[] = [];

    for (const f of Array.from(files)) {
      const reasons: string[] = [];

      if (current.length + validFiles.length >= this.FILE_CONFIG.maxFiles) {
        reasons.push(`เกินจำนวนสูงสุด ${this.FILE_CONFIG.maxFiles} ไฟล์`);
      }

      const sizeMB = f.size / (1024 * 1024);
      if (sizeMB > this.FILE_CONFIG.maxSizeMB) {
        reasons.push(`ขนาดเกิน ${this.FILE_CONFIG.maxSizeMB} MB`);
      }

      const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
      if (
        !this.FILE_CONFIG.allowedTypes.includes(f.type) &&
        !this.FILE_CONFIG.allowedExtensions.includes(ext)
      ) {
        reasons.push(`ประเภทไฟล์ไม่รองรับ`);
      }

      if (reasons.length > 0) {
        errors.push(`• ${f.name} (${reasons.join(', ')})`);
        this.swalService.warning(errors.join('\n'));
      } else {
        validFiles.push({ name: f.name, size: f.size, file: f });
      }
    }

    if (validFiles.length > 0) {
      this.noteForm.attachments = [...current, ...validFiles];
    }
  }

  // onFileSelected(event: any) {
  //   const files: FileList = event.target.files;
  //   this.addFiles(files);
  // }

  // private addFiles(files: FileList) {
  //   const newFiles = Array.from(files).map((f) => ({
  //     name: f.name,
  //     size: f.size,
  //     file: f,
  //   }));

  //   this.noteForm.attachments = [...this.noteForm.attachments, ...newFiles];
  // }

  removeAttachment(index: number) {
    this.noteForm.attachments.splice(index, 1);
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
