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
} from '../../interfaces/allowance.interface';
import { createListingComputeds, createListingState } from '../../utils/listing.util';
import { DateUtilityService } from '../../services/date-utility.service';
import { LoadingService } from '../../services/loading';
import { ErrorService } from '../../services/error';
import { AllowanceApiService } from '../../services/allowance-api.service';
import { AuthService } from '../../services/auth.service';
import { APPROVAL_STATUS_TABS } from '../../config/approval.config';
import { StatusUtil } from '../../utils/status.util';

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

  dateUtil = inject(DateUtilityService);

  readonly pageTitle = signal('อนุมัติใบเบิกเบี้ยเลี้ยง');
  readonly listing = createListingState();
  readonly allowanceTabs = APPROVAL_STATUS_TABS.filter((t) => t !== 'Referred Back');

  isLoading = this.loadingService.loading('allowance-approvals-list');
  isRefreshing = signal(false);
  isModalOpen = signal(false);
  selectedItem = signal<ApprovalItem | null>(null);
  initialAction = signal<'Approved' | 'Rejected' | 'Referred Back' | null>(null);
  approvals = signal<ApprovalItem[]>([]);
  private initialized = false;

  constructor() {
    this.listing.filterStatus.set('Pending');
  }

  ngOnInit() {
    const voucherNo = this.route.snapshot.queryParamMap.get('voucherNo') || '';
    const claimId = this.route.snapshot.queryParamMap.get('id') || '';
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
    this.loadClaims();
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

  getTabCount(tab: string) {
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

  isPending(item: ApprovalItem): boolean {
    return (item.rawStatus || '').toLowerCase() === 'pending';
  }

  viewDetail(item: ApprovalItem) {
    this.selectedItem.set(item);
    this.initialAction.set(null);
    this.isModalOpen.set(true);
  }

  openActionModal(item: ApprovalItem, action: 'Approved' | 'Rejected') {
    this.selectedItem.set(item);
    this.initialAction.set(action);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedItem.set(null);
    this.initialAction.set(null);
    this.loadClaims();
  }

  onStatusUpdated() {
    this.refresh();
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
        this.listing.currentPage.set(0);
        this.loadingService.stop('allowance-approvals-list');
        this.isRefreshing.set(false);
        this.initialized = true;

        const claimToOpen =
          mapped.find((item) => item.requestNo === autoOpenVoucherNo) ||
          mapped.find((item) => item.requestId.toString() === autoOpenClaimId);

        if (claimToOpen) {
          this.viewDetail(claimToOpen);
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
      requestDetail: `ขั้นตอนที่ ${claim.stepNo}`,
      amount: claim.totalAmount,
      status: this.mapClaimStatus(claim.status),
      rawStatus: claim.status,
      type: 'allowance',
      originalData: {
        claimId: claim.claimID,
        voucherNo: claim.voucherNo,
        employeeCode: claim.employeeCode,
        employeeName: claim.employeeName,
        totalAmount: claim.totalAmount,
        claimDate: claim.submittedAt,
        status: claim.status,
        createdAt: claim.submittedAt,
        details: [],
      } as MealAllowanceClaim,
      remark: '',
    };
  }

  private mapClaimStatus(status: string): 'Pending' | 'Approved' | 'Rejected' | 'Referred Back' {
    switch ((status || '').toUpperCase()) {
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      default:
        return 'Pending';
    }
  }
}
