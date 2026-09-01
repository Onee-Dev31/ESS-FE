import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalShellComponent } from '../../../../components/shared/modal-shell/modal-shell';

@Component({
  selector: 'app-acknowledge-modal',
  imports: [CommonModule, FormsModule, ModalShellComponent],
  templateUrl: './acknowledge-modal.html',
  styleUrl: './acknowledge-modal.scss',
})
export class AcknowledgeModal {
  @Input() ticket: any;
  @Output() submitModal = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<void>();

  selectedTag: number | null = null;
  message = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ticket'] && this.ticket) {
      this.selectedTag = this.ticket.ticketTypeId;
      this.message = '';
    }
  }

  close(): void {
    this.closeModal.emit();
  }

  save(): void {
    if (!this.selectedTag) return;

    const ticketTypeId = Number(this.selectedTag);

    this.submitModal.emit({
      ticketTypeId,
      message: this.message,
      attachments: [],
      repairCostType: ticketTypeId === 1 ? 'free' : undefined,
    });
  }

  onTagChange(_value: number): void {
    this.message = '';
  }
}
