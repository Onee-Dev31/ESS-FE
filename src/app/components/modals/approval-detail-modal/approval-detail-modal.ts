import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../services/toast';
import { FilePreviewModalComponent } from '../file-preview-modal/file-preview-modal';
import { StatusLabelPipe } from '../../../pipes/status-label.pipe';
import { UnifiedItem, ApprovalItem } from '../../../interfaces/approval.interface';
import { MedicalClaim } from '../../../interfaces/medical.interface';
import { REQUEST_STATUS } from '../../../constants/request-status.constant';
import { StatusUtil } from '../../../utils/status.util';
import { ApprovalsHelperService } from '../../../services/approvals-helper.service';
import { modalAnimation, fadeIn } from '../../../animations/animations';
import { ApprovalService } from '../../../services/approval.service';
import { AuthService } from '../../../services/auth.service';
import { SwalService } from '../../../services/swal.service';
import dayjs from 'dayjs';
import { FileConverterService } from '../../../services/file-converter';
import { DateUtilityService } from '../../../services/date-utility.service';

interface PreviewFile {
  fileName: string;
  fileUrl?: string;
  date: string;
}

/** Component แสดงรายละเอียดรายการขออนุมัติ และจัดการการอนุมัติ/ตีกลับ (Modal Detail) */
@Component({
  selector: 'app-approval-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, FilePreviewModalComponent, StatusLabelPipe],
  animations: [modalAnimation, fadeIn],
  templateUrl: './approval-detail-modal.html',
  styleUrl: './approval-detail-modal.scss',
})
export class ApprovalDetailModalComponent implements OnInit {
  private approvalsHelper = inject(ApprovalsHelperService);
  private toastService = inject(ToastService);
  private approvelService = inject(ApprovalService);
  private authService = inject(AuthService);
  private swalService = inject(SwalService);
  private fileConverter = inject(FileConverterService);
  dateUtil = inject(DateUtilityService);

  @Input({ required: true }) approvalItem!: ApprovalItem;
  @Input() initialAction: 'Approved' | 'Rejected' | 'Referred Back' | null = null;

  @Output() onClose = new EventEmitter<void>();
  @Output() onStatusUpdated = new EventEmitter<void>();

  protected readonly Math = Math;

  modalActiveTab = signal<'Items' | 'Comments'>('Items');
  isActionConfirm = signal<boolean>(false);
  actionType = signal<'Approved' | 'Rejected' | 'Referred Back' | null>(null);
  reasonText = signal<string>('');

  currentDetailItems = signal<UnifiedItem[]>([]);
  currentDetailType = signal<string | null>(null);
  detailedStatus = signal<string>('');

  steps = [
    { label: 'พนักงานยืนยัน', id: 1, icon: 'fas fa-user-check' },
    // { label: 'ต้นสังกัดอนุมัติ', id: 2, icon: 'fas fa-sitemap' },
    { label: 'ฝ่ายบุคคลอนุมัติ', id: 3, icon: 'fas fa-users-cog' },
    // { label: 'ผู้บริหารอนุมัติ', id: 4, icon: 'fas fa-user-tie' },
    // { label: 'ฝ่ายบัญชีอนุมัติ', id: 5, icon: 'fas fa-file-invoice-dollar' }
  ];

  currentStepIndex = computed(() => {
    const status = this.detailedStatus() || this.approvalItem.rawStatus;
    if (!status) return 0;
    if (status === 'pending') return 1;
    if (status === 'rejected') return -1;
    if (status === 'approved') return 6;

    // if (status === REQUEST_STATUS.WAITING_CHECK || status === REQUEST_STATUS.NEW) return 1;
    // if (status === REQUEST_STATUS.PENDING_APPROVAL) return 4;
    // if (status === REQUEST_STATUS.APPROVED) return 6;
    // if (status === REQUEST_STATUS.REJECTED || status === REQUEST_STATUS.REFERRED_BACK) return -1;
    // if (status === REQUEST_STATUS.VERIFIED) return 2;
    return 1;
  });

  getDisplayStatus(): string {
    const status = this.detailedStatus() || this.approvalItem.rawStatus;
    const s = status?.trim();
    if (!s) return 'รออนุมัติ';
    if (s === REQUEST_STATUS.REJECTED || s === 'ไม่อนุมัติ') return 'ไม่อนุมัติ';
    if (s === REQUEST_STATUS.REFERRED_BACK || s === 'รอแก้ไข') return 'รอแก้ไข';
    if (s === REQUEST_STATUS.APPROVED || s === 'อนุมัติแล้ว' || s.includes('จ่าย'))
      return 'อนุมัติแล้ว';
    return 'รออนุมัติ';
  }

  getStatusClass(status: string): string {
    return StatusUtil.getStatusBadgeClass(status);
  }

  isPreviewModalOpen = signal(false);
  previewFiles = signal<any[]>([]);

  selectedRequestDetails = computed(() => ({
    type: this.currentDetailType(),
    items: this.currentDetailItems(),
  }));

  modalItemsTotal = computed(() =>
    this.currentDetailItems().reduce((sum, item) => sum + item.amount, 0),
  );

  ngOnInit() {
    this.loadDetails();
    if (this.initialAction) {
      this.isActionConfirm.set(true);
      this.actionType.set(this.initialAction);
    }
  }

  /** โหลดข้อมูลรายละเอียดเพิ่มเติมตามประเภทของคำขอ */
  loadDetails() {
    const item = this.approvalItem;
    if (!item?.type) return;

    this.currentDetailType.set(item.type);

    // ถ้าเป็น medical claim จาก API ใหม่ — ใช้ originalData โดยตรง
    if (item.type === 'medical') {
      const claim = item.originalData as MedicalClaim;
      if (claim?.claimId != null) {
        this.detailedStatus.set(claim.status);
        const unifiedItems: UnifiedItem[] = [
          {
            date: `${claim.treatmentDateFrom} – ${claim.treatmentDateTo}`,
            description: `${claim.diseaseName} | ${claim.hospitalName}`,
            amount: claim.requestedAmount,
            attachedFile: claim.attachments?.[0]?.fileUrl ?? '',
          },
        ];
        this.currentDetailItems.set(unifiedItems);
        return;
      }
    }

    // fallback: mock service (ใช้กับ non-medical หรือ medical ข้อมูลเก่า)
    const service = this.approvalsHelper.getServiceByType(item.type);
    service.getRequestById(item.requestNo).subscribe((data) => {
      if (!data) return;
      this.detailedStatus.set(data.status);
      if (item.type === 'medical') {
        const unifiedItems: UnifiedItem[] = (data.items || []).map(
          (m: {
            treatmentDateFrom?: string;
            diseaseType?: string;
            hospital?: string;
            requestedAmount?: number;
            attachedFile?: string;
          }) => ({
            date: m.treatmentDateFrom || data.createDate,
            description: `${m.diseaseType} (${m.hospital})` || '',
            amount: m.requestedAmount || 0,
            attachedFile: m.attachedFile || '',
          }),
        );
        this.currentDetailItems.set(unifiedItems);
      } else {
        this.currentDetailItems.set((data.items || []) as UnifiedItem[]);
      }
    });
  }

  openActionConfirm(action: 'Approved' | 'Rejected' | 'Referred Back') {
    this.isActionConfirm.set(true);
    this.actionType.set(action);
    this.reasonText.set('');
  }

  closeActionConfirm() {
    this.isActionConfirm.set(false);
    this.actionType.set(null);
    this.reasonText.set('');
  }

  /** ยืนยันการดำเนินการ (อนุมัติ/ปฏิเสธ) พร้อมตรวจสอบว่ามีการระบุเหตุผลหรือไม่ */
  confirmAction() {
    const item = this.approvalItem;
    const action = this.actionType();
    const reason = this.reasonText();

    if (!item || !action) return;
    if ((action === 'Rejected' || action === 'Referred Back') && !reason.trim()) {
      this.toastService.warning('กรุณาระบุเหตุผลการไม่อนุมัติ/ยกเลิกเพื่อความชัดเจน');
      return;
    }

    this.updateStatus(item, action, reason);
  }

  /** อัปเดตสถานะไปยัง Service และแสดงข้อความตอบกลับไปยังผู้ใช้ */
  private updateStatus(
    item: ApprovalItem,
    newStatus: 'Approved' | 'Rejected' | 'Referred Back',
    reason?: string,
  ) {
    if (!item.type) return;

    let statusCode = REQUEST_STATUS.WAITING_CHECK;
    if (newStatus === 'Rejected') statusCode = REQUEST_STATUS.REJECTED;
    else if (newStatus === 'Referred Back') statusCode = REQUEST_STATUS.REFERRED_BACK;
    else if (newStatus === 'Approved') statusCode = REQUEST_STATUS.APPROVED;

    console.log(item, newStatus, reason);

    const payload = {
      action: newStatus.toLowerCase(),
      reviewedBy: this.authService.userData().CODEMPID,
      ...(newStatus.toLowerCase() === 'rejected' && {
        rejectionReason: reason?.trim() || '',
      }),
    };

    console.log(item.requestId, payload);

    this.approvelService.updateTypeClaims(item.requestId, payload).subscribe({
      next: (res) => {
        if (!res?.success) {
          this.swalService.warning('ไม่สามารถบันทึกข้อมูลได้');
          return;
        }

        this.swalService.success(res.message || 'บันทึกสำเร็จ');
      },

      error: (error) => {
        console.error('Approved Claim Error:', error);

        this.swalService.warning(
          'เกิดข้อผิดพลาด',
          error?.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้',
        );
      },
    });
    this.onStatusUpdated.emit();
    this.onClose.emit();
  }

  close() {
    this.onClose.emit();
  }

  openPreview(att: any) {
    console.log(att, this.selectedRequestDetails());
    if (!att) return;
    this.previewFiles.set([this.fileConverter.buildPreviewFile(att)]);
    this.isPreviewModalOpen.set(true);
  }

  openAllAttachments() {
    const claim = this.approvalItem.originalData as MedicalClaim;
    if (!claim?.attachments?.length) return;
    this.previewFiles.set(this.fileConverter.buildPreviewFiles(claim.attachments));
    this.isPreviewModalOpen.set(true);
  }

  get medicalClaim(): MedicalClaim | null {
    const claim = this.approvalItem?.originalData as MedicalClaim;
    return claim?.claimId != null ? claim : null;
  }

  get isApproved(): boolean {
    return (this.medicalClaim?.approvedAmount ?? 0) > 0;
  }
  closePreview() {
    this.isPreviewModalOpen.set(false);
  }
}
