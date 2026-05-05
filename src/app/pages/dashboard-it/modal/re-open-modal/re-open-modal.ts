import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

@Component({
  selector: 'app-re-open-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './re-open-modal.html',
  styleUrl: './re-open-modal.scss',
})
export class ReOpenModal {
  @Input() ticket: any;
  @Output() closeModal = new EventEmitter<void>();
  @Output() submitModal = new EventEmitter<any>();

  close() {
    this.closeModal.emit();
  }

  save(form: NgForm) {
    if (form.invalid) {
      return;
    }

    const payload = {
      reason: form.value.reason,
    };

    console.log(payload);

    this.submitModal.emit(payload);
  }
}
