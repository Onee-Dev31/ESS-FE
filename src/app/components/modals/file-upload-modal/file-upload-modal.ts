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

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.tempFileName = file.name;
      this.isDeleted = false;
    }
  }

  removeFile() {
    this.tempFileName = null;
    this.isDeleted = true;
  }

  confirm() {
    this.onSave.emit(this.tempFileName);
  }

  close() {
    this.onClose.emit();
  }
}