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
import { FileConverterService } from '../../../services/file-converter';
import { DateUtilityService } from '../../../services/date-utility.service';
import { ApprovalAllowanceService } from '../../../services/approval-allowance';
import { ApprovalTransportService } from '../../../services/approval-transport.service';
import { MedicalService } from '../../../services/medical.service';

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
  private medicalService = inject(MedicalService);
  private approvalAllowanceService = inject(ApprovalAllowanceService);
  private approvalTransportService = inject(ApprovalTransportService);
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

  medicalDetail = signal<any>(null);
  allowanceDetail = signal<any>(null);

  // steps = [
  //   { label: 'คำร้องใหม่', id: 1, icon: 'fas fa-user-check' },
  //   { label: 'อยู่ระหว่างการอนุมัติ', id: 2, icon: 'fas fa-users-cog' },
  //   { label: 'อนุมัติแล้ว', id: 3, icon: 'fa-solid fa-stamp' },
  // ];

  steps = computed(() => {
    const status = this.detailedStatus() || this.approvalItem.rawStatus;
    const isRejected = status === 'rejected';

    return [
      { label: 'คำร้องใหม่', id: 1, icon: 'fas fa-user-check' },
      { label: 'อยู่ระหว่างการอนุมัติ', id: 2, icon: 'fas fa-users-cog' },
      {
        label: isRejected ? 'ไม่ผ่านการอนุมัติ' : 'อนุมัติแล้ว',
        id: 3,
        icon: isRejected ? 'fas fa-times-circle' : 'fa-solid fa-stamp',
      },
    ];
  });

  currentStepIndex = computed(() => {
    const status = this.detailedStatus() || this.approvalItem.rawStatus;
    if (!status) return 0;
    if (status === 'new') return 1;
    if (status === 'pending') return 2;
    if (status === 'rejected') return 3;
    if (status === 'approved') return 4;
    return 1;
  });

  isRejected = computed(() => {
    const status = this.detailedStatus() || this.approvalItem.rawStatus;
    return status === 'rejected';
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
    console.log('[modal] approverStepStatus:', JSON.stringify(this.approvalItem.approverStepStatus));
    console.log('[modal] rawStatus:', this.approvalItem.rawStatus);
    console.log('[modal] status:', this.approvalItem.status);
    this.loadDetails();
    if (this.initialAction) {
      this.isActionConfirm.set(true);
      this.actionType.set(this.initialAction);
    }
  }

  // groupedSteps = computed(() => {
  //   const steps = this.allowanceDetail().approvalSteps;
  //   const map = new Map<number, any[]>();

  //   steps.forEach((s: any) => {
  //     if (!map.has(s.step_no)) map.set(s.step_no, []);
  //     map.get(s.step_no)!.push(s);
  //   });

  //   return Array.from(map.entries()).map(([stepNo, approvers]) => {
  //     // step ที่มีหลายคน → เอาคนที่ approved ก่อน ถ้าไม่มีให้เป็น null
  //     const approved = approvers.find((a) => a.status === 'approved');
  //     const display = approvers.length > 1 ? (approved ?? null) : approvers[0];

  //     return { stepNo, display };
  //   });
  // });

  groupedSteps = computed(() => {
    const steps = this.allowanceDetail()?.approvalSteps ?? [];
    const map = new Map<number, any[]>();

    steps.forEach((s: any) => {
      if (!map.has(s.step_no)) map.set(s.step_no, []);
      map.get(s.step_no)!.push(s);
    });

    return Array.from(map.entries()).map(([stepNo, approvers]) => {
      const approved = approvers.find((a) => a.status === 'approved');
      const rejected = approvers.find((a) => a.status === 'rejected');
      const acted = approved ?? rejected ?? null;

      return { stepNo, approvers, acted };
    });
  });
  /** โหลดข้อมูลรายละเอียดเพิ่มเติมตามประเภทของคำขอ */
  loadDetails() {
    const item = this.approvalItem;
    if (!item?.type) return;

    this.currentDetailType.set(item.type);

    switch (item.type) {
      case 'medical':
        this.loadMedicalDetail(item);
        break;
      case 'allowance':
      case 'taxi':
        this.loadAllowanceDetail(item);
        break;
      case 'vehicle':
        this.loadVehicleDetail(item);
        break;
      default:
        this.loadFallbackDetail(item);
    }
  }

  private loadMedicalDetail(item: ApprovalItem) {
    console.log('loadMedicalDetail', item);
    const claim = item.originalData as MedicalClaim;
    if (claim?.claimId == null) {
      this.loadFallbackDetail(item);
      return;
    }

    this.medicalDetail.set(claim);
    this.detailedStatus.set(claim.status);
  }

  private loadAllowanceDetail(item: ApprovalItem) {
    console.log('loadAllowanceDetail', item);
    const claim = item.originalData as any;
    if (claim?.claimID == null) {
      this.loadFallbackDetail(item);
      return;
    }

    this.approvalAllowanceService.getClaimById(item.requestId).subscribe((res) => {
      if (!res) return;
      console.log(res);
      this.allowanceDetail.set(res.data);
    });

    this.detailedStatus.set((item.claimStatus || item.rawStatus).toLowerCase());
  }

  private loadVehicleDetail(item: ApprovalItem) {
    const claim = item.originalData as any;
    if (claim?.claimID == null) {
      this.loadFallbackDetail(item);
      return;
    }
    this.approvalTransportService.getClaimById(item.requestId).subscribe((res) => {
      if (!res) return;
      this.allowanceDetail.set(res.data);
    });
    this.detailedStatus.set((item.claimStatus || item.rawStatus).toLowerCase());
  }

  private loadFallbackDetail(item: ApprovalItem) {
    console.log(item);
    const service = this.approvalsHelper.getServiceByType(item.type || 'transport');
    service.getRequestById(item.requestNo).subscribe((data) => {
      if (!data) return;
      this.detailedStatus.set(data.status);
      this.currentDetailItems.set((data.items || []) as UnifiedItem[]);
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

    this.swalService.loading('กำลังบันทึกข้อมูล...');
    switch (item.type) {
      case 'medical':
        this.updateMedicalStatus(item, action, reason);
        break;
      case 'allowance':
        this.updateAllowanceStatus(item, action, reason);
        break;
      case 'vehicle':
        this.updateVehicleStatus(item, action, reason);
        break;
      default:
        this.updateStatus(item, action, reason); // fallback เดิม
    }
  }

  /** อัปเดตสถานะไปยัง Service และแสดงข้อความตอบกลับไปยังผู้ใช้ */
  private updateStatus(
    item: ApprovalItem,
    newStatus: 'Approved' | 'Rejected' | 'Referred Back',
    reason?: string,
  ) {
    console.log(item, newStatus, reason);
    // if (!item.type) return;

    // let statusCode = REQUEST_STATUS.WAITING_CHECK;
    // if (newStatus === 'Rejected') statusCode = REQUEST_STATUS.REJECTED;
    // else if (newStatus === 'Referred Back') statusCode = REQUEST_STATUS.REFERRED_BACK;
    // else if (newStatus === 'Approved') statusCode = REQUEST_STATUS.APPROVED;

    // const payload = {
    //   action: newStatus.toLowerCase(),
    //   reviewedBy: this.authService.userData().CODEMPID,
    //   ...(newStatus.toLowerCase() === 'rejected' && {
    //     rejectionReason: reason?.trim() || '',
    //   }),
    // };

    // this.approvelService.updateTypeClaims(item.requestId, payload).subscribe({
    //   next: (res) => {
    //     if (!res?.success) {
    //       this.swalService.warning('ไม่สามารถบันทึกข้อมูลได้');
    //       return;
    //     }

    //     this.swalService.success(res.message || 'บันทึกสำเร็จ');
    //   },

    //   error: (error) => {
    //     console.error('Approved Claim Error:', error);

    //     this.swalService.warning(
    //       'เกิดข้อผิดพลาด',
    //       error?.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้',
    //     );
    //   },
    // });
    // this.onStatusUpdated.emit();
    // this.onClose.emit();
  }

  private updateMedicalStatus(item: ApprovalItem, action: string, reason?: string) {
    const payload = this.buildPayload(action, reason);
    this.approvelService.updateTypeClaims(item.requestId, payload).subscribe({
      next: (res) => this.handleResponse(res),
      error: (err) => this.handleError(err),
    });
  }

  private updateVehicleStatus(item: ApprovalItem, action: string, reason?: string) {
    const actionKey =
      action === 'Referred Back' ? 'referred_back' : action.toLowerCase();
    const payload: any = {
      approver_aduser: this.authService.currentUser() || '',
      action: actionKey,
    };
    if (action !== 'Approved') {
      payload.remark = reason?.trim() || '';
    }
    console.log('[updateVehicleStatus] claimId:', item.requestId);
    console.log('[updateVehicleStatus] payload:', JSON.stringify(payload));
    this.approvalTransportService.updateStatusClaim(item.requestId, payload).subscribe({
      next: (res) => this.handleResponse(res),
      error: (err) => this.handleError(err),
    });
  }

  private updateAllowanceStatus(item: ApprovalItem, action: string, reason?: string) {
    const payload = this.buildPayload(action, reason);
    // TODO: เปลี่ยนเป็น allowanceService จริง
    this.approvalAllowanceService.updateStatusClaim(item.requestId, payload).subscribe({
      next: (res) => this.handleResponse(res),
      error: (err) => this.handleError(err),
    });
  }

  private buildPayload(action: string, reason?: string) {
    return {
      action: action.toLowerCase(),
      reviewedBy: this.authService.userData().CODEMPID,
      ...(action.toLowerCase() === 'rejected' && {
        rejectionReason: reason?.trim() || '',
      }),
    };
  }

  private handleResponse(res: any) {
    if (!res?.success) {
      this.swalService.warning('ไม่สามารถบันทึกข้อมูลได้');
      return;
    }
    this.swalService.success(res.message || 'บันทึกสำเร็จ');
    this.onStatusUpdated.emit();
    this.onClose.emit();
  }

  private handleError(error: any) {
    console.error('[handleError] status:', error?.status);
    console.error('[handleError] BE message:', error?.error?.message ?? error?.error ?? error?.message);
    this.swalService.warning('เกิดข้อผิดพลาด', error?.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้');
  }

  close() {
    this.onClose.emit();
  }

  openPreview(att: any) {
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

  get isApproved(): boolean {
    return (this.medicalDetail()?.approvedAmount ?? 0) > 0;
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }
}
