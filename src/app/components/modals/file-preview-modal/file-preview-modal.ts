import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  inject,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface FilePreviewItem {
  fileName: string;
  date: string;
  url?: string;
  type?: string;
}

@Component({
  selector: 'app-file-preview-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-preview-modal.html',
  styleUrls: ['./file-preview-modal.scss'],
})
export class FilePreviewModalComponent implements OnInit {
  private sanitizer = inject(DomSanitizer);

  @Input() files: FilePreviewItem[] = [];
  @Output() onClose = new EventEmitter<void>();

  selectedFile: FilePreviewItem | null = null;
  hasError: boolean = false;

  // ngOnChanges(changes: SimpleChanges) {
  //     if (changes['files']) {
  //         console.log('files changed:', changes['files'].currentValue);
  //     }
  // }

  ngOnInit() {
    if (this.files.length > 0) {
      this.selectedFile = this.files[0];
      this.hasError = false;
    }
  }

  selectFile(file: FilePreviewItem) {
    this.selectedFile = file;
    this.hasError = false;
  }

  onPreviewError() {
    this.hasError = true;
  }

  close() {
    this.onClose.emit();
  }

  isImage(file: FilePreviewItem | null): boolean {
    if (!file || !file.type) return false;
    return file.type.startsWith('image/');
  }

  isPdf(file: FilePreviewItem | null): boolean {
    if (!file || !file.type) return false;
    return file.type === 'application/pdf';
  }

  getSafeUrl(url: string | undefined): SafeResourceUrl {
    if (!url) return '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  async downloadFile(file: FilePreviewItem) {
    alert('mocl');
  }

  // downloadAll() {
  //   this.files.forEach((file, index) => {
  //     setTimeout(() => {
  //       this.downloadFile(file);
  //     }, index * 500); // delay เพื่อไม่ให้ browser block
  //   });
  // }
}
