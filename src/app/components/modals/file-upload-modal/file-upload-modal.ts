import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../services/toast';
import {
  FilePreviewItem,
  FilePreviewModalComponent,
} from '../file-preview-modal/file-preview-modal';
import { FileConverterService } from '../../../services/file-converter';
import { DateUtilityService } from '../../../services/date-utility.service';

@Component({
  selector: 'app-file-upload-modal',
  standalone: true,
  imports: [CommonModule, FilePreviewModalComponent],
  templateUrl: './file-upload-modal.html',
  styleUrl: './file-upload-modal.scss',
})
export class FileUploadModal implements OnChanges {
  private toastService = inject(ToastService);
  private fileConvertService = inject(FileConverterService);
  dateUtil = inject(DateUtilityService);

  @Input() currentFiles: File[] = [];
  @Input() dateLabel: string = '';

  @Output() onSave = new EventEmitter<File[]>();
  @Output() onClose = new EventEmitter<void>();

  tempFiles: File[] = [];
  isDeleted: boolean = false;

  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['currentFiles']) {
      this.tempFiles = [...(this.currentFiles || [])];
      this.isDeleted = false;
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const maxSizeInBytes = 4 * 1024 * 1024;

    const newFiles: File[] = [];

    Array.from(input.files).forEach((file) => {
      if (file.size > maxSizeInBytes) {
        this.toastService.warning(
          `ไฟล์ ${file.name} มีขนาด ${(file.size / (1024 * 1024)).toFixed(2)}MB เกิน 4MB`,
        );
        return;
      }
      newFiles.push(file);
    });

    this.tempFiles = [...this.tempFiles, ...newFiles];
    this.isDeleted = false;

    input.value = ''; // reset เพื่อเลือกไฟล์เดิมซ้ำได้
  }

  removeFile(index: number) {
    this.tempFiles.splice(index, 1);
    this.isDeleted = true;
  }
  confirm() {
    this.onSave.emit(this.tempFiles);
  }

  close() {
    this.onClose.emit();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (!event.dataTransfer?.files) return;

    const files = Array.from(event.dataTransfer.files);
    this.handleFiles(files);
  }

  handleFiles(files: File[]) {
    const maxSize = 4 * 1024 * 1024;

    files.forEach((file) => {
      if (file.size > maxSize) {
        this.toastService.warning(`ไฟล์ ${file.name} เกิน 4MB`);
        return;
      }

      this.tempFiles.push(file);
    });
  }

  getFileIcon(file: any): string {
    const actualFile = file instanceof File ? file : file?.file instanceof File ? file.file : null;

    const type = actualFile.type;

    if (type.includes('image')) return 'fas fa-file-image text-blue';
    if (type.includes('pdf')) return 'fas fa-file-pdf text-red';
    if (type.includes('excel') || type.includes('spreadsheet'))
      return 'fas fa-file-excel text-green';

    return 'fas fa-file text-gray';
  }

  formatFileSize(size: number): string {
    return (size / (1024 * 1024)).toFixed(2) + ' MB';
  }

  viewFile(file: any) {
    this.previewFiles.set([this.fileConvertService.buildPreviewFile(file)]);

    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }
}
