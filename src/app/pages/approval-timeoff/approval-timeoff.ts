import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import {
  LeaveApprovalAction,
  LeaveApprovalCounts,
  LeaveApprovalRequest,
  TimeOffService,
} from '../../services/time-off.service';
import { LoadingService } from '../../services/loading';
import { ErrorService } from '../../services/error';
import { DateUtilityService } from '../../services/date-utility.service';
import { createListingComputeds, createListingState } from '../../utils/listing.util';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { PageLoaderComponent } from '../../components/shared/page-loader/page-loader';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { FilePreviewModalComponent } from '../../components/modals/file-preview-modal/file-preview-modal';
import { FileConverterService } from '../../services/file-converter';
import { ToastService } from '../../services/toast';
import { DialogService } from '../../services/dialog';
import {
  ApprovalStep,
  ApprovalStepState,
  ApprovalStepsComponent,
} from '../../components/shared/approval-steps/approval-steps';

type ApprovalFilter = '' | 'Pending' | 'Approved' | 'Rejected' | 'Sendback';

@Component({
  selector: 'app-approval-timeoff',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ApprovalStepsComponent,
    PageHeaderComponent,
    PageLoaderComponent,
    EmptyStateComponent,
    PaginationComponent,
    FilePreviewModalComponent,
  ],
  templateUrl: './approval-timeoff.html',
  styleUrl: './approval-timeoff.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalTimeoff implements OnInit {
  private readonly timeOffService = inject(TimeOffService);
  private readonly authService = inject(AuthService);
  private readonly loadingService = inject(LoadingService);
  private readonly errorService = inject(ErrorService);
  private readonly fileConverter = inject(FileConverterService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(DialogService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly dateUtil = inject(DateUtilityService);

  readonly isLoading = this.loadingService.loading('timeoff-approvals-list');
  readonly approvals = signal<LeaveApprovalRequest[]>([]);
  readonly approvalCounts = signal<LeaveApprovalCounts>({
    pending: 0,
    approved: 0,
    rejected: 0,
    sendback: 0,
  });
  readonly isRefreshing = signal(false);
  readonly listing = createListingState(10);
  readonly tabs: { value: ApprovalFilter; label: string }[] = [
    // { value: '', label: 'ทั้งหมด' },
    { value: 'Pending', label: 'รออนุมัติ' },
    { value: 'Approved', label: 'อนุมัติแล้ว' },
    { value: 'Rejected', label: 'ไม่อนุมัติ' },
    { value: 'Sendback', label: 'ส่งกลับแก้ไข' },
  ];

  readonly comps = createListingComputeds(this.approvals, this.listing, (item, search, status) => {
    const action = this.getMyAction(item).toLowerCase();
    const matchesStatus = !status || action === status.toLowerCase();
    const matchesSearch =
      !search ||
      item.leave_number.toLowerCase().includes(search) ||
      item.employee_code.toLowerCase().includes(search) ||
      (item.employee_full_name ?? '').toLowerCase().includes(search) ||
      (item.employee_nickname ?? '').toLowerCase().includes(search) ||
      (item.employee_department ?? '').toLowerCase().includes(search) ||
      (item.employee_company_name ?? '').toLowerCase().includes(search) ||
      item.leave_name_th.toLowerCase().includes(search) ||
      item.reason.toLowerCase().includes(search);
    return matchesStatus && matchesSearch;
  });

  readonly isPreviewModalOpen = signal(false);
  readonly expandedRequestIds = signal<Set<number>>(new Set());
  readonly highlightedRequestId = signal<number | null>(null);
  private pendingFocusRequestId = signal<number | null>(null);
  readonly actionRequestId = signal<number | null>(null);
  readonly pendingAction = signal<LeaveApprovalAction | null>(null);
  readonly actionComment = signal('');
  readonly isSubmittingAction = signal(false);
  readonly previewFiles = signal<{ fileName: string; url: string; date: string; type: string }[]>(
    [],
  );

  constructor() {
    this.listing.filterStatus.set('Pending');
  }

  ngOnInit(): void {
    // เมื่อกด noti ซ้ำขณะอยู่ในหน้านี้อยู่แล้ว (route เดิม แค่ query param เปลี่ยน) ต้อง refresh
    // ข้อมูลใหม่ด้วย ไม่ใช่แค่ focus รายการ — ข้าม emission แรกเพราะ loadApprovals() ท้าย ngOnInit จัดการอยู่แล้ว
    let isFirstEmit = true;
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const requestId = Number(params['requestId']);
      if (requestId) this.pendingFocusRequestId.set(requestId);
      if (!isFirstEmit) this.loadApprovals(true);
      isFirstEmit = false;
    });

    this.loadApprovals();
  }

  private applyPendingFocus(): void {
    const targetId = this.pendingFocusRequestId();
    if (targetId == null) return;
    this.pendingFocusRequestId.set(null);

    const index = this.comps.filteredData().findIndex((item) => item.request_id === targetId);
    if (index === -1) return;

    this.listing.currentPage.set(Math.floor(index / this.listing.pageSize()));

    const next = new Set(this.expandedRequestIds());
    next.add(targetId);
    this.expandedRequestIds.set(next);

    this.highlightedRequestId.set(targetId);
    setTimeout(() => this.highlightedRequestId.set(null), 8000);

    const scrollToRequest = (retries = 10) => {
      const el = document.getElementById('leave-request-' + targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (retries > 0) {
        setTimeout(() => scrollToRequest(retries - 1), 300);
      }
    };
    setTimeout(() => scrollToRequest(), 0);
  }

  loadApprovals(refresh = false): void {
    const approverCode = this.authService.userData()?.CODEMPID?.trim() ?? '';
    if (!approverCode) {
      this.approvals.set([]);
      this.errorService.handle(new Error('ไม่พบรหัสพนักงานของผู้อนุมัติ'), {
        component: 'ApprovalTimeoff',
        action: 'load-approvals',
      });
      return;
    }

    if (refresh) this.isRefreshing.set(true);
    else this.loadingService.start('timeoff-approvals-list');

    const currentYear = new Date().getFullYear();
    const status = this.listing.filterStatus() as ApprovalFilter;

    console.log('[getApprovalsListByEmpCode] Request', {
      approverCode,
      status,
      yearFrom: currentYear,
      yearTo: currentYear,
    });

    this.timeOffService
      .getApprovalsListByEmpCode(approverCode, status, currentYear, currentYear)
      .subscribe({
        next: (response) => {
          console.log('[getApprovalsListByEmpCode] Response ', response);
          this.approvals.set(response.data);
          this.approvalCounts.set(response.counts);
          this.listing.currentPage.set(0);
          this.loadingService.stop('timeoff-approvals-list');
          this.isRefreshing.set(false);
          this.applyPendingFocus();
        },
        error: (error) => {
          this.loadingService.stop('timeoff-approvals-list');
          this.isRefreshing.set(false);
          this.errorService.handle(error, {
            component: 'ApprovalTimeoff',
            action: 'load-approvals',
          });
        },
      });
  }

  setActiveTab(status: ApprovalFilter): void {
    this.listing.filterStatus.set(status);
    this.listing.currentPage.set(0);
    this.loadApprovals();
  }

  getTabCount(status: ApprovalFilter): number {
    const counts = this.approvalCounts();
    if (!status) return counts.pending + counts.approved + counts.rejected + counts.sendback;
    return counts[status.toLowerCase() as keyof LeaveApprovalCounts];
  }

  getMyAction(item: LeaveApprovalRequest): string {
    return (item.MySlot === 2 ? item.approver2_action : item.approver1_action) || 'Pending';
  }

  getStatusLabel(item: LeaveApprovalRequest): string {
    const action = this.getMyAction(item).toLowerCase();
    if (action === 'approved') return 'อนุมัติแล้ว';
    if (action === 'rejected') return 'ไม่อนุมัติ';
    if (action === 'sendback') return 'ส่งกลับแก้ไข';
    return 'รออนุมัติ';
  }

  getStatusClass(item: LeaveApprovalRequest): string {
    return `status-${this.getMyAction(item).toLowerCase()}`;
  }

  getWeekday(date: string): string {
    if (!date) return '';
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return '';
    return ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'][value.getDay()];
  }

  getRequestTiming(item: LeaveApprovalRequest): string {
    const createdDate = this.toDateOnly(item.created_at);
    const leaveDate = this.toDateOnly(item.start_date);
    if (!createdDate || !leaveDate) return '';
    const diffDays = Math.round((leaveDate.getTime() - createdDate.getTime()) / 86_400_000);
    if (diffDays > 0) return `ล่วงหน้า ${diffDays} วัน`;
    if (diffDays < 0) return `ย้อนหลัง ${Math.abs(diffDays)} วัน`;
    return '';
  }

  getApprovalSteps(item: LeaveApprovalRequest): ApprovalStep[] {
    const approver1Action = (item.approver1_action || 'Pending').toLowerCase();
    const approver2Action = (item.approver2_action || 'Pending').toLowerCase();
    const overallStatus = (item.overall_status || item.status || '').toLowerCase();
    const hasSecondApprover = Boolean(item.approver2_code?.trim());
    const isCancelled = ['cancelled', 'canceled', 'ยกเลิกคำขอ', 'ถูกยกเลิก'].includes(
      overallStatus,
    );
    const isComplete = overallStatus === 'approved';

    const firstApproverState: ApprovalStepState = isCancelled
      ? 'pending'
      : isComplete || approver1Action === 'approved'
        ? 'completed'
        : approver1Action === 'rejected'
          ? 'rejected'
          : ['sendback', 'send_back'].includes(approver1Action)
            ? 'sendback'
            : 'active';

    const steps: ApprovalStep[] = [
      { label: 'คำขอใหม่', state: isCancelled ? 'cancelled' : 'completed' },
      {
        label: 'ผู้อนุมัติคนที่ 1',
        approverCode: item.approver1_code?.trim() || undefined,
        actionReason: item.approver1_comment?.trim() || item.approver1_reason?.trim() || undefined,
        state: firstApproverState,
      },
    ];

    if (hasSecondApprover) {
      steps.push({
        label: 'ผู้อนุมัติคนที่ 2',
        approverCode: item.approver2_code?.trim() || undefined,
        actionReason: item.approver2_comment?.trim() || item.approver2_reason?.trim() || undefined,
        state: isCancelled
          ? 'pending'
          : isComplete || approver2Action === 'approved'
            ? 'completed'
            : approver2Action === 'rejected'
              ? 'rejected'
              : ['sendback', 'send_back'].includes(approver2Action)
                ? 'sendback'
                : approver1Action === 'approved'
                  ? 'active'
                  : 'pending',
      });
    }

    steps.push({
      label: 'อนุมัติแล้ว',
      state: !isCancelled && isComplete ? 'completed' : 'pending',
    });

    return steps;
  }

  isExpanded(requestId: number): boolean {
    return this.expandedRequestIds().has(requestId);
  }

  toggleDetails(requestId: number): void {
    const next = new Set(this.expandedRequestIds());
    if (next.has(requestId)) {
      next.delete(requestId);
      if (this.actionRequestId() === requestId) this.cancelAction();
    } else {
      next.add(requestId);
    }
    this.expandedRequestIds.set(next);
  }

  openCommentAction(item: LeaveApprovalRequest, action: 'Rejected' | 'Sendback'): void {
    this.actionRequestId.set(item.request_id);
    this.pendingAction.set(action);
    this.actionComment.set('');
  }

  cancelAction(): void {
    this.actionRequestId.set(null);
    this.pendingAction.set(null);
    this.actionComment.set('');
  }

  async submitApproval(item: LeaveApprovalRequest, action: LeaveApprovalAction): Promise<void> {
    const comment = this.actionComment().trim();
    if ((action === 'Rejected' || action === 'Sendback') && !comment) {
      this.toastService.warning('กรุณาระบุเหตุผล');
      return;
    }

    const approverCode = this.authService.userData()?.CODEMPID?.trim() ?? '';
    if (!approverCode || this.isSubmittingAction()) return;

    const actionMeta: Record<
      LeaveApprovalAction,
      { title: string; confirmText: string; type: 'info' | 'danger' | 'warning' }
    > = {
      Approved: { title: 'ยืนยันการอนุมัติ', confirmText: 'อนุมัติ', type: 'info' },
      Rejected: { title: 'ยืนยันการไม่อนุมัติ', confirmText: 'ไม่อนุมัติ', type: 'danger' },
      Sendback: { title: 'ยืนยันการส่งกลับแก้ไข', confirmText: 'ส่งกลับแก้ไข', type: 'warning' },
    };
    const meta = actionMeta[action];
    const requester = item.employee_full_name || item.employee_code;
    const reasonText = comment ? ` เหตุผล: ${comment}` : '';
    const confirmed = await this.dialogService.confirm({
      title: meta.title,
      message: `${item.leave_number} • ${requester}${reasonText}`,
      confirmText: meta.confirmText,
      cancelText: 'ยกเลิก',
      type: meta.type,
    });
    if (!confirmed) return;

    this.isSubmittingAction.set(true);

    const payload = {
      request_id: item.request_id,
      approver_code: approverCode,
      status: action,
      comment,
    };
    console.log(payload);
    this.timeOffService.approveLeaveRequestV2(payload).subscribe({
      next: () => {
        this.toastService.success('บันทึกผลการอนุมัติเรียบร้อย');
        this.isSubmittingAction.set(false);
        this.cancelAction();
        this.loadApprovals(true);
      },
      error: (error) => {
        this.isSubmittingAction.set(false);
        this.errorService.handle(error, {
          component: 'ApprovalTimeoff',
          action: 'submit-approval',
        });
      },
    });
  }

  submitPendingAction(item: LeaveApprovalRequest): void {
    const action = this.pendingAction();
    if (action) this.submitApproval(item, action);
  }

  private toDateOnly(value: string): Date | null {
    const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  openAllAttachments(files: unknown[]): void {
    console.log('openAllAttachments', files);
    if (!files?.length) return;
    this.previewFiles.set(this.fileConverter.buildPreviewFiles(files));
    this.isPreviewModalOpen.set(true);
  }

  closePreview(): void {
    this.isPreviewModalOpen.set(false);
  }

  goToPage(page: number): void {
    this.listing.currentPage.set(page);
  }

  setPageSize(size: number): void {
    this.listing.pageSize.set(size);
    this.listing.currentPage.set(0);
  }
}
