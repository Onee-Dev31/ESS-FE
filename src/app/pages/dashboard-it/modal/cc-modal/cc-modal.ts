import { Component, EventEmitter, Input, Output, signal, SimpleChanges } from '@angular/core';
import {
  FilePreviewItem,
  FilePreviewModalComponent,
} from '../../../../components/modals/file-preview-modal/file-preview-modal';
import dayjs from 'dayjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cc-modal',
  imports: [CommonModule],
  templateUrl: './cc-modal.html',
  styleUrl: './cc-modal.scss',
})
export class CcModal {
  @Input() ticket: any;
  @Output() submitModal = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<void>();

  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  noteForm = {
    message: '',
    attachments: [] as any[],
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ticket']) {
      console.log('ticket:', this.ticket);
      console.log('ccList:', this.ticket?.ccList);
    }
  }

  close() {
    this.closeModal.emit();
  }

  save() {
    // const payload = {
    //   id: this.ticket.ticketId,
    //   message: this.noteForm.message,
    //   attachments: this.noteForm.attachments,
    // };
    // this.submitModal.emit(payload);
  }

  addCC() {
    alert('mock');
  }

  // FUNCTION MAP
  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (!img.src.includes('user.png')) {
      img.src = 'user.png';
    }
  }
}
