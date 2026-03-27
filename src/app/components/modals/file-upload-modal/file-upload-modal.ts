import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../services/toast';

@Component({
  selector: 'app-file-upload-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-upload-modal.html',
  styleUrl: './file-upload-modal.scss',
})
export class FileUploadModal implements OnChanges {
  private toastService = inject(ToastService);

  @Input() currentFile: File | null = null;
  @Input() dateLabel: string = '';

  @Output() onSave = new EventEmitter<File | null>();
  @Output() onClose = new EventEmitter<void>();

  tempFile: File | null = null;
  isDeleted: boolean = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['currentFile']) {
      this.tempFile = this.currentFile;
      this.isDeleted = false;
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const maxSizeInBytes = 4 * 1024 * 1024;
      if (file.size > maxSizeInBytes) {
        this.toastService.warning('ขนาดไฟล์ต้องไม่เกิน 4MB (ไฟล์ที่เลือกมีขนาด ' + (file.size / (1024 * 1024)).toFixed(2) + 'MB)');
        input.value = '';
        return;
      }

      this.tempFile = file;
      this.isDeleted = false;
    }
  }

  removeFile() {
    this.tempFile = null;
    this.isDeleted = true;
  }

  confirm() {
    this.onSave.emit(this.tempFile);
  }

  close() {
    this.onClose.emit();
  }
}
