import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { ApprovalDetailModalComponent } from '../../components/modals/approval-detail-modal/approval-detail-modal';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { StatusLabelPipe } from '../../pipes/status-label.pipe';
import { NzInputModule } from 'ng-zorro-antd/input';
import { ApprovalItem } from '../../interfaces/approval.interface';
import {
  MealAllowanceClaim,
  MealAllowancePendingApproval,
  MealAllowancePendingApprovalsSummary,
} from '../../interfaces/allowance.interface';
import { createListingComputeds, createListingState } from '../../utils/listing.util';
import { DateUtilityService } from '../../services/date-utility.service';
import { LoadingService } from '../../services/loading';
import { ErrorService } from '../../services/error';
import { ExportService } from '../../services/export';
import { ToastService } from '../../services/toast';
import { AllowanceApiService } from '../../services/allowance-api.service';
import { AuthService } from '../../services/auth.service';
import { StatusUtil } from '../../utils/status.util';
import { APPROVAL_STATUS_TABS } from '../../config/approval.config';

@Component({
  selector: 'app-approval-allowance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    ApprovalDetailModalComponent,
    SkeletonComponent,
    EmptyStateComponent,
    StatusLabelPipe,
    NzInputModule,
  ],
  templateUrl: './approval-allowance.html',
  styleUrl: './approval-allowance.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalAllowanceComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private allowanceApi = inject(AllowanceApiService);
  private authService = inject(AuthService);
  private loadingService = inject(LoadingService);
  private errorService = inject(ErrorService);
  private exportService = inject(ExportService);
  private toastService = inject(ToastService);

  dateUtil = inject(DateUtilityService);

  readonly pageTitle = signal('อนุมัติใบเบิกเบี้ยเลี้ยง');
  readonly listing = createListingState();
  readonly allowanceTabs = APPROVAL_STATUS_TABS.filter((t) => t !== 'Referred Back');

  isLoading = this.loadingService.loading('allowance-approvals-list');
  isDetailLoading = this.loadingService.loading('allowance-approval-detail');
  isRefreshing = signal(false);
  isModalOpen = signal(false);
  showExportMenu = signal(false);
  voucherFilter = signal('');
  selectedItem = signal<ApprovalItem | null>(null);
  initialAction = signal<'Approved' | 'Rejected' | 'Referred Back' | null>(null);
  approvals = signal<ApprovalItem[]>([]);
  approvalSummary = signal<MealAllowancePendingApprovalsSummary | null>(null);
  private initialized = false;

  constructor() {
    this.listing.filterStatus.set('Pending');
  }

  ngOnInit() {
    const voucherNo = this.route.snapshot.queryParamMap.get('voucherNo') || '';
    const claimId = this.route.snapshot.queryParamMap.get('id') || '';
    this.voucherFilter.set(voucherNo);
    this.loadClaims(voucherNo, claimId);
  }

  comps = createListingComputeds(this.approvals, this.listing, (item, search, status) => {
    const matchStatus = !status || item.status === status;
    const normalizedSearch = search.trim();
    const matchSearch =
      !normalizedSearch ||
      item.requestNo.toLowerCase().includes(normalizedSearch) ||
      item.requestBy.name.toLowerCase().includes(normalizedSearch) ||
      item.requestBy.employeeId.toLowerCase().includes(normalizedSearch) ||
      item.requestDetail.toLowerCase().includes(normalizedSearch);
    return matchStatus && matchSearch;
  });

  refresh() {
    this.loadClaims(this.voucherFilter());
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.listing.searchText.set(input.value);
    this.listing.currentPage.set(0);
  }

  setActiveTab(tab: string) {
    this.listing.filterStatus.set(tab);
    this.listing.currentPage.set(0);
  }

  getTabCount(tab: string): number {
    const summary = this.approvalSummary();
    if (summary) {
      switch (tab.toLowerCase()) {
        case 'pending':
          return summary.pending;
        case 'approved':
          return summary.approved;
        case 'rejected':
          return summary.rejected;
        default:
          return summary.total;
      }
    }
    return this.approvals().filter((item) => item.status === tab).length;
  }

  trackByRowId(index: number, item: ApprovalItem): string {
    return `${item.requestId}-${item.requestNo}-${index}`;
  }

  getClaim(item: ApprovalItem): MealAllowanceClaim | null {
    return item.originalData?.claimId != null ? (item.originalData as MealAllowanceClaim) : null;
  }

  getStatusClass(status: string) {
    return StatusUtil.getStatusBadgeClaims(status.toLowerCase());
  }

  onImgError(event: Event) {
    const avatar = (event.target as HTMLElement).closest('.emp-avatar') as HTMLElement;
    if (avatar) avatar.classList.add('img-error');
  }

  getEmployeeAvatarLabel(claim: MealAllowanceClaim): string {
    const name = (claim.employeeName || '').trim();
    if (name) {
      const compact = name.replace(/\s+/g, '');
      return compact.slice(0, 2).toUpperCase();
    }
    return claim.employeeCode.slice(-2).toUpperCase();
  }

  viewDetail(item: ApprovalItem) {
    this.openClaimDetail(item);
  }

  openActionModal(item: ApprovalItem, action: 'Approved' | 'Rejected') {
    this.openClaimDetail(item, action);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedItem.set(null);
    this.initialAction.set(null);
    this.loadClaims(this.voucherFilter());
  }

  onStatusUpdated() {
    this.refresh();
  }

  toggleExportMenu() {
    this.showExportMenu.set(!this.showExportMenu());
  }

  async exportPDF() {
    this.showExportMenu.set(false);
    this.loadingService.start('export');
    try {
      await this.exportService.exportToPDF('allowance-approvals-table', 'approvals-allowance');
      this.toastService.success('Export PDF สำเร็จ');
    } catch (error) {
      this.errorService.handle(error, { component: 'ApprovalAllowance', action: 'export-pdf' });
    } finally {
      this.loadingService.stop('export');
    }
  }

  async exportExcel() {
    this.showExportMenu.set(false);
    this.loadingService.start('export');
    try {
      const data = this.comps.paginatedData().map((item) => ({
        requestNo: item.requestNo,
        requestDate: item.requestDate,
        requestBy: item.requestBy.name,
        employeeId: item.requestBy.employeeId,
        requestDetail: item.requestDetail,
        amount: item.amount,
        status: item.status,
      }));
      const columns = [
        { header: 'เลขที่เอกสาร', key: 'requestNo', width: 15 },
        { header: 'วันที่สร้าง', key: 'requestDate', width: 15 },
        { header: 'รหัสพนักงาน', key: 'employeeId', width: 15 },
        { header: 'รายละเอียด', key: 'requestDetail', width: 35 },
        { header: 'จำนวนเงิน', key: 'amount', width: 15 },
        { header: 'สถานะ', key: 'status', width: 15 },
      ];
      await this.exportService.exportToExcel(data, columns, 'approvals-allowance');
      this.toastService.success('Export Excel สำเร็จ');
    } catch (error) {
      this.errorService.handle(error, { component: 'ApprovalAllowance', action: 'export-excel' });
    } finally {
      this.loadingService.stop('export');
    }
  }

  print() {
    this.showExportMenu.set(false);
    this.loadingService.start('export');
    try {
      this.exportService.printElement('allowance-approvals-table');
      this.toastService.success('เปิดหน้าพิมพ์แล้ว');
    } catch (error) {
      this.errorService.handle(error, { component: 'ApprovalAllowance', action: 'print' });
    } finally {
      this.loadingService.stop('export');
    }
  }

  getClaimDateRange(claim: MealAllowanceClaim): string {
    if (!claim.details?.length) {
      return this.dateUtil.formatDateToBE(claim.claimDate, 'DD/MM/YYYY');
    }

    const dates = claim.details
      .map((detail) => detail.work_date)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    if (!dates.length) {
      return this.dateUtil.formatDateToBE(claim.claimDate, 'DD/MM/YYYY');
    }

    const first = this.dateUtil.formatDateToBE(dates[0], 'DD/MM/YYYY');
    const last = this.dateUtil.formatDateToBE(dates[dates.length - 1], 'DD/MM/YYYY');
    return first === last ? first : `${first} - ${last}`;
  }

  readonly summary = computed(() => ({
    totalClaims: this.approvals().length,
    pendingClaims: this.approvals().filter((item) => item.status === 'Pending').length,
  }));

  private openClaimDetail(
    item: ApprovalItem,
    action: 'Approved' | 'Rejected' | 'Referred Back' | null = null,
  ) {
    this.loadingService.start('allowance-approval-detail');
    this.allowanceApi.getClaimById(item.requestId).subscribe({
      next: (res) => {
        const detail = this.mergeClaimDetail(res.data, item);
        const detailStatus = this.mapClaimStatus(detail.status);
        this.selectedItem.set({
          ...item,
          amount: detail.totalAmount,
          // คงค่า rawStatus จาก step status ของ item เดิม (pending/approved/rejected)
          // ไม่ override ด้วย overall claim status เพื่อให้ปุ่ม Approve/Reject
          // แสดงเฉพาะ item ที่ยังรออนุมัติ (rawStatus === 'pending') เท่านั้น
          rawStatus: item.rawStatus,
          status: detailStatus,
          originalData: detail,
        });
        this.initialAction.set(action);
        this.isModalOpen.set(true);
        this.loadingService.stop('allowance-approval-detail');
      },
      error: (error) => {
        this.loadingService.stop('allowance-approval-detail');
        this.errorService.handle(error, {
          component: 'ApprovalAllowance',
          action: 'load-claim-detail',
        });
      },
    });
  }

  private loadClaims(autoOpenVoucherNo?: string, autoOpenClaimId?: string) {
    const adUser = this.authService.currentUser() || '';
    if (!this.initialized) {
      this.loadingService.start('allowance-approvals-list');
    } else {
      this.isRefreshing.set(true);
    }

    this.allowanceApi.getPendingApprovals(adUser, autoOpenVoucherNo).subscribe({
      next: (res) => {
        const mapped = (res.data || []).map((claim) => this.mapClaimToApproval(claim));
        this.approvals.set(mapped);
        this.approvalSummary.set(res.summary ?? null);
        this.listing.currentPage.set(0);
        this.loadingService.stop('allowance-approvals-list');
        this.isRefreshing.set(false);
        this.initialized = true;

        const claimToOpen =
          mapped.find((item) => item.requestNo === autoOpenVoucherNo) ||
          mapped.find((item) => item.requestId.toString() === autoOpenClaimId);

        if (claimToOpen) {
          this.openClaimDetail(claimToOpen);
        }
      },
      error: (error) => {
        this.loadingService.stop('allowance-approvals-list');
        this.isRefreshing.set(false);
        this.errorService.handle(error, {
          component: 'ApprovalAllowance',
          action: 'load-claims',
        });
      },
    });
  }

  private getEmployeeImageUrl(employeeCode: string): string {
    return `https://empimg.oneeclick.co:8048/employeeimage/${employeeCode}.jpg`;
  }

  private mapClaimToApproval(claim: MealAllowancePendingApproval): ApprovalItem {
    return {
      requestId: claim.claimID,
      requestNo: claim.voucherNo ?? `#${claim.claimID}`,
      requestDate: claim.submittedAt,
      requestBy: {
        name: claim.employeeName ?? claim.employeeCode,
        employeeId: claim.employeeCode,
        department: '-',
        company: '-',
      },
      requestType: 'ค่าเบี้ยเลี้ยง',
      typeId: 0,
      requestDetail: `รออนุมัติ Step ${claim.stepNo}`,
      amount: claim.totalAmount,
      status: this.mapClaimStatus(claim.status),
      rawStatus: (claim.status || '').toLowerCase(),
      type: 'allowance',
      originalData: {
        claimId: claim.claimID,
        voucherNo: claim.voucherNo,
        employeeCode: claim.employeeCode,
        employeeName: claim.employeeName,
        employeeImageUrl: claim.employeeImageUrl ?? this.getEmployeeImageUrl(claim.employeeCode),
        totalAmount: claim.totalAmount,
        claimDate: claim.submittedAt,
        status: claim.status,
        createdAt: claim.submittedAt,
        details: [],
        currentStep: claim.stepNo,
      } as MealAllowanceClaim,
      remark: '',
    };
  }

  private mapClaimStatus(status: string): 'Pending' | 'Approved' | 'Rejected' | 'Referred Back' {
    const normalizedStatus = (status || '').trim().toUpperCase();

    if (!normalizedStatus || normalizedStatus === 'PENDING') {
      return 'Pending';
    }

    if (normalizedStatus === 'APPROVED' || normalizedStatus.includes('จ่าย')) {
      return 'Approved';
    }

    if (normalizedStatus === 'REJECTED' || normalizedStatus === 'ไม่อนุมัติ') {
      return 'Rejected';
    }

    if (
      normalizedStatus === 'REFERRED_BACK' ||
      normalizedStatus === 'REFERRED BACK' ||
      normalizedStatus === 'รอแก้ไข'
    ) {
      return 'Referred Back';
    }

    // Default to Pending for unknown statuses
    return 'Pending';
  }

  private mergeClaimDetail(claim: MealAllowanceClaim, item: ApprovalItem): MealAllowanceClaim {
    const listData = item.originalData as MealAllowanceClaim | undefined;
    const listStep = listData?.currentStep ?? 0;
    // resolvedStep: ให้ priority กับ currentStep จาก getClaimById (รู้ step จริง ๆ ที่ reject/pending)
    // fallback ไป listStep (stepNo ของ approver นี้) เฉพาะตอน API ไม่ส่งมา
    const resolvedStep = claim.currentStep ?? listStep;

    const thisApproverStatus = (item.rawStatus || '').toLowerCase();
    const claimNotFullyApproved = (claim.status || '').toUpperCase() !== 'APPROVED';

    let currentStep = resolvedStep;

    // ถ้า approver คนนี้ approve ไปแล้ว แต่ overall claim ยังไม่ fully approved
    // → bump currentStep ขึ้น 1 เพื่อให้ step ของ approver นี้แสดงเป็น "อนุมัติแล้ว"
    if (thisApproverStatus === 'approved' && claimNotFullyApproved && resolvedStep <= listStep) {
      currentStep = listStep + 1;
    }

    // หมายเหตุ: สำหรับ rejected case ไม่ต้อง override currentStep ด้วย listStep
    // เพราะ getClaimById คือ source of truth ที่รู้ว่า reject ที่ step ไหน
    // การใช้ listStep จะผิดเมื่อ Approver2 มาดู claim ที่ถูก reject โดย Approver1

    return {
      ...claim,
      employeeName: claim.employeeName ?? item.requestBy.name,
      departmentName: claim.departmentName ?? item.requestBy.department,
      companyName: claim.companyName ?? item.requestBy.company,
      currentStep,
      employeeImageUrl: claim.employeeImageUrl ?? listData?.employeeImageUrl,
    };
  }
}
