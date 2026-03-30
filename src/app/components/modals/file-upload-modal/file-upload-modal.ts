import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../services/toast';
import { ExistingAttachment } from '../../../interfaces/taxi.interface';

export interface FileSaveResult {
  newFiles: File[];
  keptAttachments: ExistingAttachment[];
}

@Component({
  selector: 'app-file-upload-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-upload-modal.html',
  styleUrl: './file-upload-modal.scss',
})
export class FileUploadModal implements OnChanges {
  private toastService = inject(ToastService);

  @Input() currentFiles: File[] = [];
  @Input() existingAttachments: ExistingAttachment[] = [];
  @Input() dateLabel: string = '';

  @Output() onSave = new EventEmitter<FileSaveResult>();
  @Output() onClose = new EventEmitter<void>();

  tempFiles: File[] = [];
  keptAttachments: ExistingAttachment[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['currentFiles']) {
      this.tempFiles = [...(this.currentFiles ?? [])];
    }
    if (changes['existingAttachments']) {
      this.keptAttachments = [...(this.existingAttachments ?? [])];
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const maxSizeInBytes = 4 * 1024 * 1024;
    for (const file of Array.from(input.files)) {
      if (file.size > maxSizeInBytes) {
        this.toastService.warning(`ไฟล์ "${file.name}" มีขนาดเกิน 4MB (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
        continue;
      }
      this.tempFiles = [...this.tempFiles, file];
    }

    input.value = '';
  }

  removeNewFile(index: number) {
    this.tempFiles = this.tempFiles.filter((_, i) => i !== index);
  }

  removeExistingAttachment(index: number) {
    this.keptAttachments = this.keptAttachments.filter((_, i) => i !== index);
  }

  get totalCount(): number {
    return this.tempFiles.length + this.keptAttachments.length;
  }

  confirm() {
    this.onSave.emit({ newFiles: this.tempFiles, keptAttachments: this.keptAttachments });
  }

  close() {
    this.onClose.emit();
  }
}
