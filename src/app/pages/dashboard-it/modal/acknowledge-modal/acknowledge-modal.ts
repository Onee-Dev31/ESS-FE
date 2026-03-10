import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';

@Component({
  selector: 'app-acknowledge-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './acknowledge-modal.html',
  styleUrl: './acknowledge-modal.scss',
})
export class AcknowledgeModal {
  @Input() ticket: any;
  @Output() submitModal = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<void>();

  selectedTag: number | null = null;
  message: string = "";
  attachments: any[] = [];

  ngOnChanges(changes: SimpleChanges) {

    if (changes['ticket'] && this.ticket) {

      console.log(this.ticket.ticketTypeId)

      this.selectedTag = this.ticket.ticketTypeId;

    }

  }

  close() {
    this.closeModal.emit();
  }

  save(form: NgForm) {
    if (form.invalid) {
      return;
    }

    this.submitModal.emit({ ticketTypeId: form.value });
  }

  onFileSelected(event: any) {
    const files: FileList = event.target.files;
    this.addFiles(files);
  }

  private addFiles(files: FileList) {
    const newFiles = Array.from(files).map(f => ({
      name: f.name,
      size: f.size,
      file: f
    }));

    this.attachments = [
      ...this.attachments,
      ...newFiles
    ];
  }
}
