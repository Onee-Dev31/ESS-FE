import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-note-modal',
  imports: [],
  templateUrl: './note-modal.html',
  styleUrl: './note-modal.scss',
})
export class NoteModal {
  @Input() ticket: any;
  @Output() submitModal = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<void>();


  close() {
    this.closeModal.emit();
  }
}
