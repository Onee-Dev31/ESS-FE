import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  inject,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../services/toast';
import { FilePreviewModalComponent } from '../file-preview-modal/file-preview-modal';
import { UnifiedItem, ApprovalItem } from '../../../interfaces/approval.interface';
import { MedicalApproveClaim, MedicalClaim } from '../../../interfaces/medical.interface';
import { REQUEST_STATUS } from '../../../constants/request-status.constant';
import { StatusUtil } from '../../../utils/status.util';
import { ApprovalsHelperService } from '../../../services/approvals-helper.service';
import { ApprovalService } from '../../../services/approval.service';
import { AuthService } from '../../../services/auth.service';
import { SwalService } from '../../../services/swal.service';
import { FileConverterService } from '../../../services/file-converter';
import { DateUtilityService } from '../../../services/date-utility.service';
import { ApprovalAllowanceService } from '../../../services/approval-allowance';
import { MedicalService } from '../../../services/medical.service';
import { VehicleService } from '../../../services/vehicle.service';
import { TaxiService } from '../../../services/taxi.service';
import { EmpAdService } from '../../../services/emp-ad-service';

interface PreviewFile {
  fileName: string;
  fileUrl?: string;
  date: string;
}

export type ApprovalDetailMode = 'requester' | 'approver';

interface ApprovalProgressStep {
  label: string;
  id: number;
  icon: string;
  actedAt?: string | null;
}

/** Component แสดงรายละเอียดรายการขออนุมัติ และจัดการการอนุมัติ/ตีกลับ (Modal Detail) */
@Component({
  selector: 'app-approval-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, FilePreviewModalComponent],
  templateUrl: './approval-detail-modal.html',
  styleUrl: './approval-detail-modal.scss',
})
export class ApprovalDetailModalComponent implements OnChanges {
  private approvalsHelper = inject(ApprovalsHelperService);
  private toastService = inject(ToastService);
  private approvelService = inject(ApprovalService);
  private medicalService = inject(MedicalService);
  private approvalAllowanceService = inject(ApprovalAllowanceService);
  private vehicleService = inject(VehicleService);
  private taxiService = inject(TaxiService);
  private empAdService = inject(EmpAdService);
  private authService = inject(AuthService);
  private swalService = inject(SwalService);
  private fileConverter = inject(FileConverterService);
  dateUtil = inject(DateUtilityService);
  private detailLoadVersion = 0;

  @Input({ required: true }) approvalItem!: ApprovalItem;
  @Input() mode: ApprovalDetailMode = 'requester';
  @Input() initialAction: 'Approved' | 'Rejected' | 'Referred Back' | null = null;
  @Input() showActions = true;
  @Input() showRequesterInfo = true;

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
  isDetailLoading = signal(true);

  medicalDetail = signal<any>(null);
  allowanceDetail = signal<any>(null);
  vehicleDetail = signal<any>(null);
  taxiDetail = signal<any>(null);

  private normalizedStatus = computed(() =>
    (this.detailedStatus() || this.approvalItem.rawStatus || '')
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, ' '),
  );

  private summarySteps(): ApprovalProgressStep[] {
    return [
      { label: 'คำร้องใหม่', id: 1, icon: 'fas fa-user-check' },
      { label: 'อยู่ระหว่างการอนุมัติ', id: 2, icon: 'fas fa-users-cog' },
      {
        label: 'อนุมัติแล้ว',
        id: 3,
        icon: 'fa-solid fa-stamp',
      },
    ];
  }

  steps = computed<ApprovalProgressStep[]>(() => {
    const groupedSteps = this.buildGroupedSteps(this.getApprovalStepRows());

    if (this.mode === 'requester' || !groupedSteps.length) {
      return this.summarySteps();
    }

    const approverSteps = groupedSteps.map((step, index) => ({
      id: index + 2,
      label: (step.acted ? [step.acted] : step.approvers)
        .map(
          (approver: any) => approver.approver_first_name + ' (' + approver.approver_nickname + ')',
        )
        .join('\n'),
      icon: step.isReferredBack
        ? 'fas fa-rotate-left'
        : step.acted?.status?.toLowerCase() === 'rejected'
          ? 'fas fa-times'
          : step.acted
            ? 'fas fa-user-check'
            : 'fas fa-user-clock',
      actedAt: step.acted?.acted_at ?? null,
    }));

    return [
      { label: 'คำร้องใหม่', id: 1, icon: 'fas fa-file-circle-plus' },
      ...approverSteps,
      {
        label: 'อนุมัติแล้ว',
        id: approverSteps.length + 2,
        icon: 'fa-solid fa-stamp',
      },
    ];
  });

  currentStepIndex = computed(() => {
    const status = this.normalizedStatus();
    const steps = this.steps();

    if (!status) return 0;
    if (status === 'new') return 1;
    if (status === 'referred back') {
      const referredBackIndex = this.buildGroupedSteps(this.getApprovalStepRows()).findIndex(
        (step) => step.isReferredBack,
      );
      return this.mode === 'approver' && referredBackIndex >= 0 ? referredBackIndex + 2 : 1;
    }
    if (status === 'pending' || status === 'under approval') {
      if (this.mode === 'approver') {
        const firstPendingIndex = this.buildGroupedSteps(this.getApprovalStepRows()).findIndex(
          (step) => !step.acted,
        );
        return firstPendingIndex >= 0 ? firstPendingIndex + 2 : Math.max(2, steps.length - 1);
      }
      return 2;
    }
    if (status === 'rejected') {
      const rejectedIndex = this.buildGroupedSteps(this.getApprovalStepRows()).findIndex(
        (step) => step.acted?.status?.toLowerCase() === 'rejected',
      );
      return this.mode === 'approver' && rejectedIndex >= 0 ? rejectedIndex + 2 : steps.length;
    }
    if (status === 'approved') return steps.length + 1;
    return 1;
  });

  progressLineInset = computed(() => 50 / this.steps().length);

  progressLineWidth = computed(() => {
    const stepCount = this.steps().length;
    if (stepCount <= 1) return 0;
    const completedIntervals = Math.max(0, this.currentStepIndex() - 1);
    return Math.min(completedIntervals, stepCount - 1) * (100 / stepCount);
  });

  isRejected = computed(() => {
    return this.normalizedStatus() === 'rejected';
  });

  isReferredBack = computed(() => this.normalizedStatus() === 'referred back');

  statusPill = computed(() => {
    const isRequester = this.mode === 'requester';

    switch (this.normalizedStatus()) {
      case 'new':
        return isRequester
          ? { label: 'New', className: 'new' }
          : { label: 'pending', className: 'under-approval' };
      case 'approved':
        return { label: isRequester ? 'Approved' : 'approved', className: 'approved' };
      case 'referred back':
        return {
          label: isRequester ? 'Referred Back' : 'referred back',
          className: 'referred-back',
        };
      case 'rejected':
        return { label: isRequester ? 'Rejected' : 'rejected', className: 'rejected' };
      default:
        return {
          label: isRequester ? 'Under approval' : 'pending',
          className: 'under-approval',
        };
    }
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['approvalItem']?.currentValue) {
      const loadVersion = ++this.detailLoadVersion;
      this.resetDetailState();
      this.loadDetails(loadVersion);
      return;
    }

    if (changes['initialAction']) {
      this.isActionConfirm.set(!!this.initialAction);
      this.actionType.set(this.initialAction);
      this.reasonText.set('');
    }
  }

  private resetDetailState(): void {
    this.modalActiveTab.set('Items');
    this.isActionConfirm.set(!!this.initialAction);
    this.actionType.set(this.initialAction);
    this.reasonText.set('');
    this.currentDetailItems.set([]);
    this.currentDetailType.set(null);
    this.detailedStatus.set('');
    this.isDetailLoading.set(true);
    this.medicalDetail.set(null);
    this.allowanceDetail.set(null);
    this.vehicleDetail.set(null);
    this.taxiDetail.set(null);
    this.isPreviewModalOpen.set(false);
    this.previewFiles.set([]);
  }

  private buildGroupedSteps(steps: any[]) {
    if (!steps?.length) return [];
    const map = new Map<number, any[]>();

    steps.forEach((s: any) => {
      if (!map.has(s.step_no)) map.set(s.step_no, []);
      map.get(s.step_no)!.push(s);
    });

    return Array.from(map.entries()).map(([stepNo, approvers]) => {
      const statusOf = (approver: any) =>
        String(approver.status ?? '')
          .trim()
          .toLowerCase();
      const approved = approvers.find((a) => statusOf(a) === 'approved');
      const rejected = approvers.find((a) => statusOf(a) === 'rejected');
      const referredBack = approvers.find(
        (a) =>
          ['cancelled', 'canceled'].includes(statusOf(a)) &&
          String(a.acted_by ?? '')
            .trim()
            .toUpperCase() ===
            String(a.approver_emp_no ?? '')
              .trim()
              .toUpperCase(),
      );
      const acted = approved ?? rejected ?? referredBack ?? null;

      return { stepNo, approvers, acted, isReferredBack: acted === referredBack };
    });
  }

  private getApprovalStepRows(): any[] {
    const detail =
      this.allowanceDetail() ??
      this.vehicleDetail() ??
      this.taxiDetail() ??
      this.medicalDetail() ??
      this.approvalItem?.originalData;

    return detail?.approvalSteps ?? detail?.approval_steps ?? [];
  }

  getReferredBackReason(remark: unknown): string {
    return String(remark ?? '')
      .replace(/^ส่งกลับแก้ไข\s*:\s*/i, '')
      .trim();
  }

  groupedSteps = computed(() => {
    return this.buildGroupedSteps(this.getApprovalStepRows());
  });

  referredBackAction = computed(
    () => this.groupedSteps().find((step) => step.isReferredBack)?.acted ?? null,
  );

  /** โหลดข้อมูลรายละเอียดเพิ่มเติมตามประเภทของคำขอ */
  loadDetails(loadVersion = this.detailLoadVersion) {
    const item = this.approvalItem;
    if (!item?.type) {
      this.finishDetailLoad(loadVersion);
      return;
    }

    this.currentDetailType.set(item.type);

    switch (item.type) {
      case 'medical':
        this.loadMedicalDetail(item, loadVersion);
        break;
      case 'allowance':
        this.loadAllowanceDetail(item, loadVersion);
        break;
      case 'vehicle':
        this.loadVehicleDetail(item, loadVersion);
        break;
      case 'taxi':
        this.loadTaxiDetail(item, loadVersion);
        break;
      default:
        this.loadFallbackDetail(item, loadVersion);
    }
  }

  private finishDetailLoad(loadVersion: number): void {
    if (loadVersion === this.detailLoadVersion) {
      this.isDetailLoading.set(false);
    }
  }

  private loadMedicalDetail(item: ApprovalItem, loadVersion: number) {
    console.log('loadMedicalDetail', item);
    const claim = item.originalData as MedicalApproveClaim | MedicalClaim;
    if (!claim || (!('claimID' in claim) && !('claimId' in claim))) {
      this.loadFallbackDetail(item, loadVersion);
      return;
    }

    this.medicalDetail.set(claim);
    this.detailedStatus.set(claim.status);
    this.finishDetailLoad(loadVersion);
  }

  private loadAllowanceDetail(item: ApprovalItem, loadVersion: number) {
    const claim = item.originalData as any;
    if (claim?.claimID == null) {
      this.loadFallbackDetail(item, loadVersion);
      return;
    }

    this.approvalAllowanceService.getClaimById(item.requestId).subscribe({
      next: (res) => {
        if (loadVersion !== this.detailLoadVersion) return;
        if (!res) {
          this.finishDetailLoad(loadVersion);
          return;
        }
        const data = res.data ?? res;
        console.log(`[Allowance] getClaimById(${item.requestId})`, data);
        this.allowanceDetail.set(data);
        this.finishDetailLoad(loadVersion);

        const empCode = data.employeeCode ?? (item.originalData as any)?.employeeCode;
        if (empCode) {
          this.empAdService.getEmployeeDetails(empCode).subscribe({
            next: (emp) => {
              if (loadVersion !== this.detailLoadVersion) return;
              if (!emp) return;
              this.allowanceDetail.update((prev) => ({
                ...prev,
                departmentName: emp.DEPARTMENT ?? emp.department ?? prev?.departmentName ?? null,
                companyName: emp.COMPANY_NAME ?? emp.company_name ?? prev?.companyName ?? null,
              }));
            },
            error: () => {},
          });
        }
      },
      error: () => this.finishDetailLoad(loadVersion),
    });

    this.detailedStatus.set((item.claimStatus || item.rawStatus).toLowerCase());
  }

  private loadVehicleDetail(item: ApprovalItem, loadVersion: number) {
    const claim = item.originalData as any;
    if (claim?.claimID == null) {
      this.loadFallbackDetail(item, loadVersion);
      return;
    }

    this.vehicleService.getClaimById(item.requestId).subscribe({
      next: (res) => {
        if (loadVersion !== this.detailLoadVersion) return;
        if (!res) {
          this.finishDetailLoad(loadVersion);
          return;
        }
        const data = res.data ?? res;
        console.log(`[vehicle] getClaimById(${item.requestId})`, data, item);
        this.vehicleDetail.set(data);
        this.finishDetailLoad(loadVersion);

        const empCode = data.employeeCode ?? (item.originalData as any)?.employeeCode;
        if (empCode) {
          this.empAdService.getEmployeeDetails(empCode).subscribe({
            next: (emp) => {
              if (loadVersion !== this.detailLoadVersion) return;
              if (!emp) return;
              this.vehicleDetail.update((prev) => ({
                ...prev,
                departmentName: emp.DEPARTMENT ?? emp.department ?? prev?.departmentName ?? null,
                companyName: emp.COMPANY_NAME ?? emp.company_name ?? prev?.companyName ?? null,
              }));
            },
            error: () => {},
          });
        }
      },
      error: () => this.finishDetailLoad(loadVersion),
    });

    this.detailedStatus.set((item.claimStatus || item.rawStatus).toLowerCase());
  }

  private loadTaxiDetail(item: ApprovalItem, loadVersion: number) {
    const claim = item.originalData as any;
    if (claim?.claimId == null) {
      this.loadFallbackDetail(item, loadVersion);
      return;
    }

    this.taxiDetail.set(claim); //ใช้ค่าจาก GetTaxiClaimsForApprover เลย

    const empCode = claim.employeeCode;
    if (empCode) {
      this.empAdService.getEmployeeDetails(empCode).subscribe({
        next: (emp) => {
          if (loadVersion !== this.detailLoadVersion) return;
          if (!emp) return;
          this.taxiDetail.update((prev) => ({
            ...prev,
            departmentName: emp.DEPARTMENT ?? emp.department ?? prev?.departmentName ?? null,
            companyName: emp.COMPANY_NAME ?? emp.company_name ?? prev?.companyName ?? null,
          }));
        },
        error: () => {},
      });
    }

    this.detailedStatus.set((item.claimStatus || item.rawStatus || '').toLowerCase());
    this.finishDetailLoad(loadVersion);
  }

  private loadFallbackDetail(item: ApprovalItem, loadVersion = this.detailLoadVersion) {
    console.log(item);
    const service = this.approvalsHelper.getServiceByType(item.type || 'transport');
    service.getRequestById(item.requestNo).subscribe({
      next: (data) => {
        if (loadVersion !== this.detailLoadVersion) return;
        if (data) {
          this.detailedStatus.set(data.status);
          this.currentDetailItems.set((data.items || []) as UnifiedItem[]);
        }
        this.finishDetailLoad(loadVersion);
      },
      error: () => this.finishDetailLoad(loadVersion),
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
  async confirmAction(): Promise<void> {
    const item = this.approvalItem;
    const action = this.actionType();
    const reason = this.reasonText();

    if (!item || !action) return;
    if ((action === 'Rejected' || action === 'Referred Back') && !reason.trim()) {
      this.toastService.warning('กรุณาระบุเหตุผลการไม่อนุมัติ/ยกเลิกเพื่อความชัดเจน');
      return;
    }

    const confirmationText: Record<
      'Approved' | 'Rejected' | 'Referred Back',
      { title: string; text: string; confirmButtonText: string }
    > = {
      Approved: {
        title: 'ยืนยันการอนุมัติ?',
        text: 'เมื่อตกลงแล้ว ระบบจะดำเนินการอนุมัติรายการนี้',
        confirmButtonText: 'อนุมัติ',
      },
      Rejected: {
        title: 'ยืนยันการไม่อนุมัติ?',
        text: 'เมื่อตกลงแล้ว ระบบจะไม่อนุมัติรายการนี้ตามเหตุผลที่ระบุ',
        confirmButtonText: 'ไม่อนุมัติ',
      },
      'Referred Back': {
        title: 'ยืนยันการส่งกลับแก้ไข?',
        text: 'เมื่อตกลงแล้ว ระบบจะส่งรายการกลับให้ผู้ขอแก้ไขตามเหตุผลที่ระบุ',
        confirmButtonText: 'ส่งกลับแก้ไข',
      },
    };
    const confirmation = confirmationText[action];
    const result = await this.swalService.confirm(
      confirmation.title,
      confirmation.text,
      undefined,
      {
        confirmButtonText: confirmation.confirmButtonText,
        cancelButtonText: 'กลับไปตรวจสอบ',
        focusCancel: true,
      },
    );

    if (!result.isConfirmed) return;

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
      case 'taxi':
        this.updateTaxiStatus(item, action, reason);
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

  private updateAllowanceStatus(item: ApprovalItem, action: string, reason?: string) {
    const payload = this.buildPayload(action, reason);
    // TODO: เปลี่ยนเป็น allowanceService จริง
    this.approvalAllowanceService.updateStatusClaim(item.requestId, payload).subscribe({
      next: (res) => this.handleResponse(res),
      error: (err) => this.handleError(err),
    });
  }

  private updateVehicleStatus(item: ApprovalItem, action: string, reason?: string) {
    const payload = {
      action: action.toLowerCase(),
      approver_aduser: this.authService.userData().CODEMPID,
      ...((action.toLowerCase() === 'rejected' || action.toLowerCase() === 'referred back') && {
        remark: reason?.trim() || '',
      }),
    };

    console.log('>>', item.requestId, payload);
    // TODO: เปลี่ยนเป็น VehicleService จริง
    this.vehicleService.updateStatusClaim(item.requestId, payload).subscribe({
      next: (res) => this.handleResponse(res),
      error: (err) => this.handleError(err),
    });
  }

  private updateTaxiStatus(item: ApprovalItem, action: string, reason?: string) {
    const payload = {
      claimId: item.requestId,
      excuteBy: this.authService.userData().CODEMPID,
      status: action as 'Approved' | 'Rejected' | 'Referred Back',
      ...((action === 'Rejected' || action === 'Referred Back') && {
        reason: reason?.trim() || '',
      }),
    };

    this.taxiService.approveTaxiClaim(payload).subscribe({
      next: (res) => this.handleResponse(res),
      error: (err) => this.handleError(err),
    });
  }

  private buildPayload(action: string, reason?: string) {
    const lowerAction = action.toLowerCase();
    return {
      action: lowerAction,
      reviewedBy: this.authService.userData().CODEMPID,
      ...((lowerAction === 'rejected' || lowerAction === 'referred back') && {
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
    console.error(error);
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
    const claim = this.approvalItem.originalData as MedicalApproveClaim | MedicalClaim;
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
