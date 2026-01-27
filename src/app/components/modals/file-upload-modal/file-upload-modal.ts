import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-upload-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-upload-modal.html',
  styleUrl: './file-upload-modal.scss',
})
export class FileUploadModal implements OnChanges {
  @Input() currentFileName: string | null = null;
  @Input() dateLabel: string = '';

  @Output() onSave = new EventEmitter<string | null>();
  @Output() onClose = new EventEmitter<void>();

  tempFileName: string | null = null;
  isDeleted: boolean = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['currentFileName']) {
      this.tempFileName = this.currentFileName;
      this.isDeleted = false;
    }
  }

  // จัดการเมื่อเลือกไฟล์ (จำกัดขนาดไม่เกิน 4MB)
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const maxSizeInBytes = 4 * 1024 * 1024;
      if (file.size > maxSizeInBytes) {
        alert('ขนาดไฟล์ต้องไม่เกิน 4MB (ไฟล์ที่เลือกมีขนาด ' + (file.size / (1024 * 1024)).toFixed(2) + 'MB)');
        event.target.value = '';
        return;
      }

      this.tempFileName = file.name;
      this.isDeleted = false;
    }
  }

  // ลบไฟล์ที่เลือกไว้ออก
  removeFile() {
    this.tempFileName = null;
    this.isDeleted = true;
  }

  // ยืนยันการอัปโหลดไฟล์
  confirm() {
    this.onSave.emit(this.tempFileName);
  }

  // ปิดหน้าต่างอัปโหลด
  close() {
    this.onClose.emit();
  }
}
