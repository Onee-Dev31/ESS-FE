import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

@Component({
  selector: 'app-deny-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './deny-modal.html',
  styleUrl: './deny-modal.scss',
})
export class DenyModal {
  @Input() ticket: any;
  @Output() submitModal = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<void>();

  close() {
    this.closeModal.emit();
  }

  save(form: NgForm) {

    if (form.invalid) {
      return;
    }

    const payload = {
      reason: form.value.reason
    };

    this.submitModal.emit(payload);
  }

}
