import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../services/toast';
import { ApprovalsHelperService } from '../../../services/approvals-helper.service';
import { ApprovalItem } from '../../../interfaces/approval.interface';
import { REQUEST_STATUS } from '../../../constants/request-status.constant';
import { modalAnimation, fadeIn } from '../../../animations/animations';

@Component({
  selector: 'app-it-request-detail-modal',
  standalone: true,
  imports: [CommonModule],
  animations: [modalAnimation, fadeIn],
  templateUrl: './it-request-detail-modal.html',
  styleUrl: './it-request-detail-modal.scss',
})
export class ItRequestDetailModal {
  private approvalsHelper = inject(ApprovalsHelperService);
  private toastService = inject(ToastService);

  @Input({ required: true }) approvalItem!: ApprovalItem;
  @Input() initialAction: 'Approved' | 'Rejected' | 'Referred Back' | null = null;
  @Output() onClose = new EventEmitter<void>();
  @Output() onStatusUpdated = new EventEmitter<void>();

  isActionConfirm = signal<boolean>(false);
  actionType = signal<'Approved' | 'Rejected' | 'Referred Back' | null>(null);

  close() {
    this.onClose.emit();
  }

  confirmApprove() {
    this.updateStatus('Approved');
  }

  // Handle Edit/Other action (User requested "แก้ไข" button)
  editRequest() {
    this.toastService.info('ฟังก์ชันแก้ไขกำลังอยู่ในระหว่างพัฒนา');
  }

  private updateStatus(newStatus: 'Approved' | 'Rejected' | 'Referred Back', reason?: string) {
    if (!this.approvalItem?.type) return;

    let statusCode = REQUEST_STATUS.WAITING_CHECK;
    if (newStatus === 'Rejected') statusCode = REQUEST_STATUS.REJECTED;
    else if (newStatus === 'Referred Back') statusCode = REQUEST_STATUS.REFERRED_BACK;
    else if (newStatus === 'Approved') statusCode = REQUEST_STATUS.APPROVED;

    const service = this.approvalsHelper.getServiceByType(this.approvalItem.type);
    service.updateStatus(this.approvalItem.requestNo, statusCode);

    this.onStatusUpdated.emit();
    this.close();
    this.toastService.success('ดำเนินการอนุมัติเรียบร้อยแล้ว');
  }
}
