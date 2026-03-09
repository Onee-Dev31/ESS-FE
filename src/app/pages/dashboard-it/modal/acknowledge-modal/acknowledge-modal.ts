import { Component, EventEmitter, Input, Output } from '@angular/core';
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

  close() {
    this.closeModal.emit();
  }

  save(form: NgForm) {
    console.log("click")

    if (form.invalid) {
      return;
    }

    const payload = form.value;

    console.log(payload);
  }

}
