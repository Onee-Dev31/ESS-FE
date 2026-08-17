import { Component, EventEmitter, Input, Output, signal, SimpleChanges } from '@angular/core';
import {
  FilePreviewItem,
  FilePreviewModalComponent,
} from '../../../../components/modals/file-preview-modal/file-preview-modal';
import dayjs from 'dayjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-note-for-it-modal',
  imports: [FilePreviewModalComponent, FormsModule],
  templateUrl: './note-for-it-modal.html',
  styleUrl: './note-for-it-modal.scss',
})
export class NoteForItModal {
  @Input() ticket: any;
  @Output() submitModal = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<void>();

  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);
  isEditing = signal<boolean>(false);

  private originalMessage = '';

  noteForm = {
    message: '',
    attachments: [] as any[],
  };

  ngOnChanges(changes: SimpleChanges) {
    if (changes['ticket']?.currentValue) {
      this.originalMessage = this.ticket.noteForIt ?? '';
      this.noteForm.message = this.originalMessage;
      this.isEditing.set(false);
    }
  }

  // ngOnInit() {
  //   if (this.ticket?.noteForIt) {
  //     this.noteForm.message = this.ticket.noteForIt;
  //     console
  //   }
  // }

  close() {
    this.closeModal.emit();
  }

  edit() {
    this.isEditing.set(true);
  }

  cancelEdit() {
    this.noteForm.message = this.originalMessage;
    this.isEditing.set(false);
  }

  save() {
    const payload = {
      id: this.ticket.ticketId,
      message: this.noteForm.message,
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
  }

  private addFiles(files: FileList) {
    const newFiles = Array.from(files).map((f) => ({
      name: f.name,
      size: f.size,
      file: f,
    }));

    this.noteForm.attachments = [...this.noteForm.attachments, ...newFiles];
  }

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
