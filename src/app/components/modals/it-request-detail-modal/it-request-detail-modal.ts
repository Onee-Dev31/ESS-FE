import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../services/toast';
import { ApprovalsHelperService } from '../../../services/approvals-helper.service';
import { ApprovalItem } from '../../../interfaces/approval.interface';
import { REQUEST_STATUS } from '../../../constants/request-status.constant';
import { modalAnimation, fadeIn } from '../../../animations/animations';
import { FilePreviewModalComponent, FilePreviewItem } from '../file-preview-modal/file-preview-modal';
import dayjs from 'dayjs';
import { ItServiceService } from '../../../services/it-service.service';
import { DialogService } from '../../../services/dialog';
import { STORAGE_KEYS } from '../../../constants/storage.constants';

@Component({
  selector: 'app-it-request-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, FilePreviewModalComponent],
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

  isRejectPanelOpen = signal<boolean>(false);
  rejectReason = signal<string>('');

  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  private itService = inject(ItServiceService);
  private dialogService = inject(DialogService);

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

  async confirmApprove() {
    const confirmed = await this.dialogService.confirm({
      title: 'ยืนยันการอนุมัติ',
      message: 'คุณต้องการอนุมัติคำขอนี้ใช่หรือไม่ ?'
    });
    if (!confirmed) return;
    this.updateStatus('Approved');
  }
  
  // Open reject reason panel
  editRequest() {
    this.rejectReason.set('');
    this.isRejectPanelOpen.set(true);
  }

  cancelReject() {
    this.isRejectPanelOpen.set(false);
    this.rejectReason.set('');
  }

  async confirmReject() {
    if (!this.rejectReason().trim()) {
      this.toastService.error('กรุณากรอกเหตุผลในการปฏิเสธ');
      return;
    }
    const confirmed = await this.dialogService.confirm({
      title: 'ยืนยันการปฏิเสธ',
      message: 'คุณต้องการปฏิเสธคำขอนี้ใช่หรือไม่ ?'
    });

    if (!confirmed) return;
    this.updateStatus('Rejected', this.rejectReason().trim());
  }
  

  private updateStatus(newStatus: 'Approved' | 'Rejected' | 'Referred Back', reason?: string) {

    const ticketId = this.approvalItem.requestId;


    if (!ticketId) return;

    const userData = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_DATA) || '{}');
    const approver = userData.CODEMPID;

    const payload:any = {
      decision: newStatus,
      actionDate: new Date().toISOString(),
      approverCodeempid: approver
    };

    if(reason){
      payload.comment = reason;
    }

    // console.log(`updateStatus Ticket ID:${ticketId}`)
    // console.log(`updateStatus payload: ${JSON.stringify(payload)}`)
    this.itService.approveTicket(ticketId, payload)
    .subscribe({
      next: () => {

        this.onStatusUpdated.emit();
        this.close();

        const msg =
          newStatus === 'Rejected'
            ? 'ปฏิเสธคำขอเรียบร้อยแล้ว'
            : 'อนุมัติคำขอเรียบร้อยแล้ว';

        this.toastService.success(msg);
      },
      error: () => {
        this.toastService.error('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
      }
    });
  }
}
