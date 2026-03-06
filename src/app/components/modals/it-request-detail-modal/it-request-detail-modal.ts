import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../services/toast';
import { ApprovalsHelperService } from '../../../services/approvals-helper.service';
import { ApprovalItem } from '../../../interfaces/approval.interface';
import { REQUEST_STATUS } from '../../../constants/request-status.constant';
import { modalAnimation, fadeIn } from '../../../animations/animations';
import { FilePreviewModalComponent, FilePreviewItem } from '../file-preview-modal/file-preview-modal';
import dayjs from 'dayjs';

@Component({
  selector: 'app-it-request-detail-modal',
  standalone: true,
  imports: [CommonModule, FilePreviewModalComponent],
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

  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  get showAttachments(): boolean {
    const ticketTypeId = this.approvalItem.originalData?.ticketTypeId;
    // 1: แจ้งซ่อม (Repair), 2: แจ้งปัญหา (Problem)
    return ticketTypeId === 1 || ticketTypeId === 2;
  }

  get requestTypeLabel(): string {
    const ticketTypeId = this.approvalItem.originalData?.ticketTypeId;
    switch (ticketTypeId) {
      case 1: return 'แจ้งซ่อม';
      case 2: return 'แจ้งปัญหา';
      case 3: return 'ขอใช้บริการ';
      default: return 'บริการ';
    }
  }

  get attachments(): any[] {
    return this.approvalItem.originalData?.attachments || [];
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getFileIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'fa-file-pdf text-danger';
      case 'doc':
      case 'docx': return 'fa-file-word text-primary';
      case 'xls':
      case 'xlsx': return 'fa-file-excel text-success';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return 'fa-file-image text-warning';
      default: return 'fa-file-alt text-muted';
    }
  }

  viewFile(file: any) {
    // For mock data, we use placeholder images/files
    const isImage = /\.(jpg|jpeg|png|gif)$/i.test(file.fileName);
    const isPdf = /\.pdf$/i.test(file.fileName);

    let type = 'application/octet-stream';
    if (isImage) type = 'image/jpeg';
    else if (isPdf) type = 'application/pdf';

    this.previewFiles.set([{
      fileName: file.fileName,
      date: dayjs(this.approvalItem.originalData?.createDate || new Date()).format('DD/MM/YYYY HH:mm'),
      url: isImage ? 'assets/images/placeholder-attachment.png' : 'assets/docs/placeholder.pdf',
      type: type
    }]);
    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }

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
