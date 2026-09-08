import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ModalShellComponent } from '../../shared/modal-shell/modal-shell';

@Component({
  selector: 'app-ticket-attachment-manager',
  standalone: true,
  imports: [CommonModule, ModalShellComponent],
  templateUrl: './ticket-attachment-manager.html',
  styleUrl: './ticket-attachment-manager.scss',
})
export class TicketAttachmentManagerComponent {
  @Input() userFiles: any[] = [];
  @Input() itFiles: any[] = [];
  @Input() canAddUserFiles = false;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSaveFiles = new EventEmitter<{ files: File[]; removedFiles: any[] }>();
  @Output() onViewFile = new EventEmitter<any>();
  @Output() onRemoveNewFile = new EventEmitter<any>();

  activeSource: 'user' | 'it' = 'user';
  pendingFiles: File[] = [];
  pendingRemovedFiles: any[] = [];

  get files(): any[] {
    if (this.activeSource === 'it') return this.itFiles;
    return [
      ...this.userFiles.filter((file) => !this.pendingRemovedFiles.includes(file)),
      ...this.pendingFiles.map((file) => ({ name: file.name, file, isNew: true, pending: true })),
    ];
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length) this.pendingFiles = [...this.pendingFiles, ...files];
    input.value = '';
  }

  removeNewFile(file: any): void {
    if (file.pending) {
      this.pendingFiles = this.pendingFiles.filter((pending) => pending !== file.file);
      return;
    }
    this.pendingRemovedFiles = [...this.pendingRemovedFiles, file];
  }

  saveFiles(): void {
    this.onSaveFiles.emit({ files: this.pendingFiles, removedFiles: this.pendingRemovedFiles });
  }

  fileName(file: any): string {
    return file?.name ?? file?.fileName ?? file?.file_name ?? 'Unknown file';
  }
}
