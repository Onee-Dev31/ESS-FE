import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../services/toast';
import { ApprovalsHelperService } from '../../../services/approvals-helper.service';
import { ApprovalItem } from '../../../interfaces/approval.interface';
import { REQUEST_STATUS } from '../../../constants/request-status.constant';
import { modalAnimation, fadeIn } from '../../../animations/animations';
import {
  FilePreviewModalComponent,
  FilePreviewItem,
} from '../file-preview-modal/file-preview-modal';
import dayjs from 'dayjs';
import { ItServiceService } from '../../../services/it-service.service';
import { DialogService } from '../../../services/dialog';
import { STORAGE_KEYS } from '../../../constants/storage.constants';
import { AuthService } from '../../../services/auth.service';
import { SwalService } from '../../../services/swal.service';
import { formatText } from '../../../utils/formatText';

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
  private authService = inject(AuthService);
  private swalService = inject(SwalService);
  private itServiceService = inject(ItServiceService);
  formatText = formatText;

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

  private dialogService = inject(DialogService);
  currentAction = signal<'Rejected' | 'Referred Back' | null>(null);

  get showAttachments(): boolean {
    const ticketTypeId = this.approvalItem.originalData?.ticketTypeId;
    // 1: แจ้งซ่อม (Repair), 2: แจ้งปัญหา (Problem)
    return ticketTypeId === 1 || ticketTypeId === 2 || ticketTypeId === 3;
  }

  get requestTypeLabel(): string {
    const ticketTypeId = this.approvalItem.originalData?.ticketTypeId;
    switch (ticketTypeId) {
      case 1:
        return 'แจ้งซ่อม';
      case 2:
        return 'แจ้งปัญหา';
      case 3:
        return 'ขอใช้บริการ';
      default:
        return 'บริการ';
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
      case 'pdf':
        return 'fa-file-pdf text-danger';
      case 'doc':
      case 'docx':
        return 'fa-file-word text-primary';
      case 'xls':
      case 'xlsx':
        return 'fa-file-excel text-success';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'fa-file-image text-warning';
      default:
        return 'fa-file-alt text-muted';
    }
  }

  viewFile(file: any) {
    this.previewFiles.set([
      {
        fileName: file.fileName,
        date: dayjs().format('DD/MM/YYYY HH:mm'),
        url: file.filePath,
        type: file.type || 'image/png',
      },
    ]);
    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }

  close() {
    this.onClose.emit();
  }

  async confirmApprove() {
    this.swalService
      .confirm('ยืนยันการอนุมัติ', 'คุณต้องการอนุมัติคำขอนี้ใช่หรือไม่ ?')
      .then((result) => {
        if (!result.isConfirmed) return;

        this.swalService.loading('กำลังบันทึกข้อมูล...');
        this.updateTicket('Approved');
      });
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
      message: 'คุณต้องการปฏิเสธคำขอนี้ใช่หรือไม่ ?',
    });

    if (!confirmed) return;
    this.updateTicket('Rejected', this.rejectReason().trim());
  }

  openReasonPanel(action: 'Rejected' | 'Referred Back') {
    this.currentAction.set(action);
    this.isRejectPanelOpen.set(true);
  }

  submitReason() {
    const reason = this.rejectReason().trim();
    if (!reason) {
      this.toastService.error('กรุณากรอกเหตุผล');
      return;
    }

    const action = this.currentAction();

    if (!action) return;

    this.swalService
      .confirm(`ยืนยันการ${action}`, `คุณต้องการ${action}คำขอนี้ใช่หรือไม่ ?`)
      .then((result) => {
        if (!result.isConfirmed) return;

        this.swalService.loading('กำลังบันทึกข้อมูล...');

        if (action === 'Referred Back') {
          this.updateTicket('Referred_Back', reason);
        } else {
          this.updateTicket(action, reason);
        }
      });
  }

  // private updateStatus(newStatus: 'Approved' | 'Rejected' | 'Referred Back', reason?: string) {

  //   console.log(this.approvalItem.requestId, newStatus, reason, this.authService.userData().CODEMPID)

  //   // const ticketId = this.approvalItem.requestId;

  //   // if (!ticketId) return;

  //   // const userData = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_DATA) || '{}');
  //   // const approver = userData.CODEMPID;

  //   // const payload: any = {
  //   //   Decision: newStatus == 'Referred Back' ? 'Referred_Back' : newStatus,
  //   //   ExecutedBy: approver,
  //   //   ...(reason ? { Comment: reason } : {})
  //   // };

  //   // // console.log(`updateStatus Ticket ID:${ticketId}`)
  //   // // console.log(`updateStatus payload: ${JSON.stringify(payload)}`)
  //   // this.itService.approveTicket(ticketId, payload)
  //   //   .subscribe({
  //   //     next: (res) => {

  //   //       if (!res?.success) {
  //   //         this.toastService.error(res.message);
  //   //         return;
  //   //       }

  //   //       this.onStatusUpdated.emit();
  //   //       this.close();

  //   //       const msg =
  //   //         newStatus === 'Rejected'
  //   //           ? 'ปฏิเสธคำขอเรียบร้อยแล้ว'
  //   //           : newStatus === 'Referred Back'
  //   //             ? 'ส่งกลับคำขอเรียบร้อยแล้ว'
  //   //             : 'อนุมัติคำขอเรียบร้อยแล้ว';

  //   //       this.toastService.success(msg);
  //   //     },
  //   //     error: (err) => {
  //   //       const message =
  //   //         err?.error?.message ||
  //   //         'เกิดข้อผิดพลาดในการอัปเดตสถานะ';

  //   //       this.toastService.error(message);
  //   //     }
  //   //   });
  // }

  updateTicket(command: 'Approved' | 'Rejected' | 'Referred_Back', reason?: string) {
    const ticketId = this.approvalItem.requestId.toString();
    const formData = new FormData();

    formData.append('decision', command);
    formData.append('executedBy', this.authService.userData().CODEMPID);

    if (reason) {
      formData.append('comment', reason);
    }

    console.log('formData', [...formData.entries()]);

    this.itServiceService.updateTicket(ticketId, formData).subscribe({
      next: (res) => {
        // console.log(res)

        if (res.success) {
          const msg =
            command === 'Rejected'
              ? 'ปฏิเสธคำขอเรียบร้อยแล้ว'
              : command === 'Referred_Back'
                ? 'ส่งกลับคำขอเรียบร้อยแล้ว'
                : 'อนุมัติคำขอเรียบร้อยแล้ว';
          this.swalService.success(res.message);
        }

        this.onStatusUpdated.emit();
        this.close();
      },
      error: (err) => {
        const message = err?.error?.message || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ';
        this.swalService.warning(message);
      },
    });
  }
}
