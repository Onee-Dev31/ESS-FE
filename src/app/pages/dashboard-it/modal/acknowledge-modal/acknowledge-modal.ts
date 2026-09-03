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

  get isApproved(): boolean {
    return (
      String(this.ticket?.approval_status ?? this.ticket?.approvalStatus ?? '')
        .trim()
        .toLowerCase() === 'approved'
    );
  }

  get ticketTypeLabel(): string {
    const ticketTypeId = Number(this.ticket?.ticketTypeId ?? this.ticket?.ticket_type_id);
    const labels: Record<number, string> = {
      1: 'แจ้งซ่อม',
      2: 'แจ้งปัญหา',
      3: 'ขอใช้บริการ',
    };
    return labels[ticketTypeId] ?? '-';
  }

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

    const ticketTypeId = this.isApproved
      ? Number(this.ticket?.ticketTypeId ?? this.ticket?.ticket_type_id)
      : Number(this.selectedTag);

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
