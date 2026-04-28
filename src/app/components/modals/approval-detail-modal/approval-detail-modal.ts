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
import {
  MealAllowanceClaim,
  MealAllowanceApprovalStep,
  MealAllowanceReviewRequest,
} from '../../../interfaces/allowance.interface';
import { REQUEST_STATUS } from '../../../constants/request-status.constant';
import { StatusUtil } from '../../../utils/status.util';
import { ApprovalsHelperService } from '../../../services/approvals-helper.service';
import { modalAnimation, fadeIn } from '../../../animations/animations';
import { ApprovalService } from '../../../services/approval.service';
import { AuthService } from '../../../services/auth.service';
import { SwalService } from '../../../services/swal.service';
import { FileConverterService } from '../../../services/file-converter';
import { DateUtilityService } from '../../../services/date-utility.service';
import { AllowanceApiService } from '../../../services/allowance-api.service';

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
  private allowanceApiService = inject(AllowanceApiService);
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
  isSubmitting = signal<boolean>(false);

  allowanceCurrentStep = computed(() => {
    if (this.approvalItem?.type !== 'allowance') return 0;
    const step = Number((this.approvalItem.originalData as MealAllowanceClaim)?.currentStep ?? 0);
    return Number.isFinite(step) ? step : 0;
  });

  rejectedAtStep = computed<number | null>(() => {
    const idx = this.currentStepIndex();
    return idx < 0 ? Math.abs(idx) : null;
  });

  // Group approvalSteps from API by stepNo → รองรับ parallel approvers ใน step เดียวกัน
  groupedAllowanceSteps = computed(() => {
    if (this.approvalItem?.type !== 'allowance') return null;
    const claim = this.approvalItem.originalData as MealAllowanceClaim;
    const rawSteps = claim?.approvalSteps;
    if (!rawSteps?.length) return null;

    const map = new Map<
      number,
      {
        id: number;
        label: string;
        icon: string;
        approvers: { name: string | null; empNo: string; status: string }[];
      }
    >();

    for (const s of rawSteps) {
      // รองรับทั้ง camelCase (stepNo) และ snake_case (step_no) จาก API
      const raw = s as any;
      const stepNo: number = raw.stepNo ?? raw.step_no ?? 0;
      const approverEmpNo: string = raw.approverEmpNo ?? raw.approver_emp_no ?? '';
      const approverName: string | null = raw.approverName ?? raw.approver_name ?? null;
      const status: string = raw.status ?? '';

      if (!stepNo) continue; // skip ถ้า stepNo ไม่ถูกต้อง

      if (!map.has(stepNo)) {
        map.set(stepNo, {
          id: stepNo,
          label: stepNo === 3 ? 'HR Parallel' : `Approver ${stepNo}`,
          icon: stepNo === 3 ? 'fas fa-users-cog' : 'fas fa-user-check',
          approvers: [],
        });
      }
      map.get(stepNo)!.approvers.push({ name: approverName, empNo: approverEmpNo, status });
    }

    if (!map.size) return null;
    return Array.from(map.values()).sort((a, b) => a.id - b.id);
  });

  steps = computed(() => {
    if (this.approvalItem?.type === 'allowance') {
      const grouped = this.groupedAllowanceSteps();
      if (grouped) return grouped;
      // fallback hardcoded ถ้า backend ยังไม่ส่ง approvalSteps มา
      return [
        {
          id: 1,
          label: 'Approver 1',
          icon: 'fas fa-user-check',
          approvers: [] as { name: string | null; empNo: string; status: string }[],
        },
        {
          id: 2,
          label: 'Approver 2',
          icon: 'fas fa-user-check',
          approvers: [] as { name: string | null; empNo: string; status: string }[],
        },
        {
          id: 3,
          label: 'HR Parallel',
          icon: 'fas fa-users-cog',
          approvers: [] as { name: string | null; empNo: string; status: string }[],
        },
      ];
    }
    return [
      {
        id: 1,
        label: 'พนักงานยืนยัน',
        icon: 'fas fa-user-check',
        approvers: [] as { name: string | null; empNo: string; status: string }[],
      },
      {
        id: 3,
        label: 'ฝ่ายบุคคลอนุมัติ',
        icon: 'fas fa-users-cog',
        approvers: [] as { name: string | null; empNo: string; status: string }[],
      },
    ];
  });

  currentStepIndex = computed(() => {
    const status = (this.detailedStatus() || this.approvalItem.rawStatus || '').toLowerCase();
    const stepCount = this.steps().length;
    if (!status) return 0;
    if (
      status === 'rejected' ||
      status === REQUEST_STATUS.REJECTED.toLowerCase() ||
      status === 'ไม่อนุมัติ'
    ) {
      const step = this.allowanceCurrentStep();
      return step ? -step : -1;
    }
    if (status === 'approved' || status === REQUEST_STATUS.APPROVED.toLowerCase()) {
      return stepCount + 1;
    }
    if (this.approvalItem?.type === 'allowance') {
      const step = this.allowanceCurrentStep();
      if (step) return step;
    }
    return 1;
  });

  progressFillWidth = computed(() => {
    const stepCount = this.steps().length;
    const current = this.rejectedAtStep() ?? this.currentStepIndex();
    return Math.min((Math.max(0, current - 1) / (stepCount - 1 || 1)) * 80, 80);
  });

  stepStates = computed(() => {
    const currentIndex = this.currentStepIndex();
    const rejectedAt = this.rejectedAtStep();

    // ถ้ามีการ reject แล้ว ให้แสดงเฉพาะ step ที่ <= rejectedAt เท่านั้น
    const visibleSteps =
      rejectedAt !== null ? this.steps().filter((step) => step.id <= rejectedAt) : this.steps();

    return visibleSteps.map((step) => {
      const completed = rejectedAt ? step.id < rejectedAt : currentIndex > step.id;
      const active = currentIndex > 0 && currentIndex === step.id;
      const rejected = rejectedAt !== null && step.id === rejectedAt;

      if (completed) {
        return {
          ...step,
          completed,
          active: false,
          rejected: false,
          circleIcon: 'fas fa-check',
          statusIcon: 'fas fa-check-circle',
          statusText: 'อนุมัติแล้ว',
        };
      }

      if (rejected) {
        return {
          ...step,
          completed: false,
          active: false,
          rejected,
          circleIcon: 'fas fa-times',
          statusIcon: 'fas fa-times-circle',
          statusText: 'ไม่อนุมัติ',
        };
      }

      if (active) {
        return {
          ...step,
          completed: false,
          active,
          rejected: false,
          circleIcon: step.icon,
          statusIcon: 'fas fa-circle-notch fa-spin',
          statusText: 'รออนุมัติ',
        };
      }

      return {
        ...step,
        completed: false,
        active: false,
        rejected: false,
        circleIcon: step.icon,
        statusIcon: 'fas fa-clock',
        statusText: 'ยังไม่ถึงขั้นตอน',
      };
    });
  });

  getDisplayStatus(): string {
    const status = (this.detailedStatus() || this.approvalItem.rawStatus || '')
      .trim()
      .toLowerCase();
    const s = status?.trim();
    if (!s) return 'รออนุมัติ';
    if (s === REQUEST_STATUS.REJECTED.toLowerCase() || s === 'rejected' || s === 'ไม่อนุมัติ') {
      return 'ไม่อนุมัติ';
    }
    if (
      s === REQUEST_STATUS.REFERRED_BACK.toLowerCase() ||
      s === 'referred_back' ||
      s === 'รอแก้ไข'
    ) {
      return 'รอแก้ไข';
    }
    if (
      s === REQUEST_STATUS.APPROVED.toLowerCase() ||
      s === 'approved' ||
      s === 'อนุมัติแล้ว' ||
      s.includes('จ่าย')
    ) {
      return 'อนุมัติแล้ว';
    }
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

    // ถ้าเป็น allowance claim — ใช้ originalData โดยตรง
    if (item.type === 'allowance') {
      const claim = item.originalData as MealAllowanceClaim;
      if (claim?.claimId != null) {
        this.detailedStatus.set((claim.status || '').toLowerCase());
        this.currentDetailItems.set(
          (claim.details || []).map((d) => ({
            date: d.work_date,
            description: d.description || `${d.actual_checkin} – ${d.actual_checkout}`,
            timeIn: d.actual_checkin,
            timeOut: d.actual_checkout,
            shiftCode: d.shift_code,
            amount: d.rate_amount,
            attachedFile: '',
          })),
        );
        return;
      }
    }

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

    const payload =
      item.type === 'allowance'
        ? this.buildAllowanceReviewPayload(newStatus, reason)
        : {
            action: newStatus.toLowerCase(),
            reviewedBy: this.authService.userData().CODEMPID,
            ...(newStatus.toLowerCase() === 'rejected' && {
              rejectionReason: reason?.trim() || '',
            }),
          };

    if (item.type === 'allowance' && !(payload as MealAllowanceReviewRequest).reviewedBy) {
      this.swalService.warning('ไม่พบ AD User', 'กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง');
      return;
    }

    this.isSubmitting.set(true);
    const request$ =
      item.type === 'allowance'
        ? this.allowanceApiService.reviewClaim(
            item.requestId,
            payload as MealAllowanceReviewRequest,
          )
        : this.approvelService.updateTypeClaims(item.requestId, payload, item.type);

    request$.subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (!res?.success) {
          this.swalService.warning('ไม่สามารถบันทึกข้อมูลได้');
          return;
        }

        this.swalService.success(
          res.message ||
            (newStatus === 'Approved' ? 'อนุมัติรายการสำเร็จ' : 'ไม่อนุมัติรายการสำเร็จ'),
        );
        this.onStatusUpdated.emit();
        this.onClose.emit();
      },

      error: (error) => {
        this.isSubmitting.set(false);
        console.error('Approved Claim Error:', error);

        this.swalService.warning(
          'เกิดข้อผิดพลาด',
          error?.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้',
        );
      },
    });
  }

  private buildAllowanceReviewPayload(
    newStatus: 'Approved' | 'Rejected' | 'Referred Back',
    reason?: string,
  ): MealAllowanceReviewRequest {
    return {
      action: newStatus === 'Approved' ? 'approved' : 'rejected',
      reviewedBy: this.getAllowanceReviewer(),
      ...(newStatus === 'Rejected' && { rejectionReason: reason?.trim() || '' }),
    };
  }

  private getAllowanceReviewer(): string {
    return this.authService.currentUser() || this.authService.userData()?.AD_USER || '';
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

  get medicalClaim(): MedicalClaim | null {
    if (this.approvalItem?.type !== 'medical') return null;
    const claim = this.approvalItem?.originalData as MedicalClaim;
    return claim?.claimId != null ? claim : null;
  }

  get allowanceClaim(): MealAllowanceClaim | null {
    if (this.approvalItem?.type !== 'allowance') return null;
    const claim = this.approvalItem?.originalData as MealAllowanceClaim;
    return claim?.claimId != null ? claim : null;
  }

  get isApproved(): boolean {
    return (
      (this.medicalClaim?.approvedAmount ?? 0) > 0 ||
      (this.allowanceClaim?.status || '').toLowerCase() === 'approved'
    );
  }

  get canTakeAction(): boolean {
    return ['pending', REQUEST_STATUS.PENDING_APPROVAL.toLowerCase()].includes(
      (this.detailedStatus() || this.approvalItem.rawStatus || '').toLowerCase(),
    );
  }
  closePreview() {
    this.isPreviewModalOpen.set(false);
  }
}
