import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { AuthService } from '../../../../services/auth.service';
import { SignalrService } from '../../../../services/signalr.service';
import {
  FilePreviewItem,
  FilePreviewModalComponent,
} from '../../../../components/modals/file-preview-modal/file-preview-modal';
import dayjs from 'dayjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-note-modal',
  imports: [FilePreviewModalComponent, FormsModule],
  templateUrl: './note-modal.html',
  styleUrl: './note-modal.scss',
})
export class NoteModal {
  private authService = inject(AuthService);
  private signalrService = inject(SignalrService);

  @Input() ticket: any;
  @Output() submitModal = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<void>();

  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  noteForm = {
    message: '',
    attachments: [] as any[],
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

    const ticketId = this.ticket?.ticketId;
    const requesterAdUser = this.ticket?.requesterAduser;
    const userData = this.authService.userData();
    const senderAdUser = this.authService.currentUser() ?? '';
    const senderName = `${userData?.NAMFIRSTT ?? ''} ${userData?.NAMLASTT ?? ''}`.trim();
    console.log('[noteNotify] ticketId:', ticketId, 'requesterAdUser:', requesterAdUser, 'senderAdUser:', senderAdUser, 'senderName:', senderName);
    if (ticketId && requesterAdUser && senderAdUser) {
      this.signalrService.noteNotify(ticketId, requesterAdUser, senderAdUser, senderName, this.noteForm.message);
    } else {
      console.warn('[noteNotify] blocked — missing field');
    }
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
