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

}
