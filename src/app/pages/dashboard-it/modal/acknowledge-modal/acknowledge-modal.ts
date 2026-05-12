import { Component, EventEmitter, Input, Output, signal, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import {
  FilePreviewItem,
  FilePreviewModalComponent,
} from '../../../../components/modals/file-preview-modal/file-preview-modal';
import dayjs from 'dayjs';

@Component({
  selector: 'app-acknowledge-modal',
  imports: [CommonModule, FormsModule, FilePreviewModalComponent],
  templateUrl: './acknowledge-modal.html',
  styleUrl: './acknowledge-modal.scss',
})
export class AcknowledgeModal {
  @Input() ticket: any;
  @Output() submitModal = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<void>();

  selectedTag: number | null = null;
  message: string = '';
  attachments: any[] = [];

  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['ticket'] && this.ticket) {
      this.selectedTag = this.ticket.ticketTypeId;
    }
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
    };
    this.submitModal.emit(payload);
  }

  onTagChange(value: number) {
    if (value !== 1) {
      this.message = '';
      this.attachments = [];
    }
  }

  onFileSelected(event: any) {
    const files: FileList = event.target.files;
    this.addFiles(files);
  }

  private addFiles(files: FileList) {
    const newFiles = Array.from(files).map((f) => ({
      name: f.name,
      size: f.size,
      file: f,
    }));

    this.attachments = [...this.attachments, ...newFiles];
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
