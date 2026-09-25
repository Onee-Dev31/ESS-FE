import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AllowanceFormComponent } from '../../components/features/allowance-form/allowance-form';
import { SwalService } from '../../services/swal.service';
import { AuthService } from '../../services/auth.service';
import {
  AllowanceRequest,
  AllowanceItem,
  MealAllowanceApprovalStep,
  MealAllowanceClaim,
  MealAllowanceRate,
} from '../../interfaces/allowance.interface';
import { LoadingService } from '../../services/loading';
import { DateUtilityService } from '../../services/date-utility.service';
import { StatusUtil } from '../../utils/status.util';
import {
  createListingState,
  clearListingFilters,
  TableSortHelper,
  createListingComputeds_v2,
} from '../../utils/listing.util';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { combineLatest, debounce, timer, switchMap, catchError, of } from 'rxjs';
import { createAngularTable, getCoreRowModel, SortingState } from '@tanstack/angular-table';
import { StatusLabelPipe } from '../../pipes/status-label.pipe';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { en_US, NzI18nService } from 'ng-zorro-antd/i18n';
import dayjs from 'dayjs';
import { AllowanceService } from '../../services/allowance.service';
import { ApprovalItem } from '../../interfaces/approval.interface';
import { ApprovalDetailModalComponent } from '../../components/modals/approval-detail-modal/approval-detail-modal';

interface FlatAllowanceRow extends AllowanceItem {
  requestId: string;
  createDate: string;
  status: string;
  isFirstInGroup: boolean;
  groupLength: number;
}

/** หน้าแสดงรายการคำขอเบี้ยเลี้ยง (Allowance) พร้อมระบบตารางข้อมูลและตัวกรอง */
@Component({
  selector: 'app-allowance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AllowanceFormComponent,
    StatusLabelPipe,
    PaginationComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    SkeletonComponent,
    NzSelectModule,
    NzInputModule,
    NzIconModule,
    NzDatePickerModule,
    ApprovalDetailModalComponent,
  ],
  templateUrl: './allowance.html',
  styleUrl: './allowance.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllowanceComponent implements OnInit {
  // private allowanceApiService = inject(AllowanceApiService);
  private allowanceService = inject(AllowanceService);
  private swalService = inject(SwalService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  dateUtil = inject(DateUtilityService);
  private loadingService = inject(LoadingService);

  dateRange: Date[] | null = null;

  protected readonly Math = Math;

  isModalOpen = false;
  isPolicyModalOpen = signal<boolean>(false);
  rates = signal<MealAllowanceRate[]>([]);
  selectedRequestId = '';
  selectedRequest: any = null;
  selectedDetailItem = signal<ApprovalItem | null>(null);

  allRequests = signal<any[]>([]);
  listing = createListingState();
  comps = createListingComputeds_v2(this.allRequests, this.listing);
  totalCount = signal<number>(0);
  sorting = signal<SortingState>([{ id: 'requestId', desc: true }]);
  private reloadTrigger = signal(0);

  isLoading = this.loadingService.loading('allowance-list');

  constructor(private i18n: NzI18nService) {
    this.i18n.setLocale(en_US);
  }

  private pendingOpenVoucherNo: string | null = null;

  ngOnInit() {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const voucherNo = params['voucherNo'] || params['ticketNumber'];
      if (voucherNo || params['_t']) {
        this.pendingOpenVoucherNo = voucherNo ?? null;
        this.listing.filterStatus.set('');
        this.listing.searchText.set(voucherNo ?? '');
        this.listing.currentPage.set(0);
      }
      this.loadData();
    });
    this.getRates();
  }

  getRates() {
    this.allowanceService.getRates().subscribe({
      next: (res) => this.rates.set(res.data),
      error: () => {},
    });
  }

  loadData() {
    // this.loadingService.start('vehicle-list');

    let [start, end]: [any, any] = ['', ''];
    if (this.dateRange && this.dateRange.length === 2) {
      [start, end] = this.dateRange;
      // console.log('Selected date range:', dayjs(start).format("YYYY-MM-DD"), dayjs(end).format("YYYY-MM-DD"));
    }

    const param = {
      employee_code: this.authService.userData().CODEMPID,
      date_from: start ? dayjs(start).format('YYYY-MM-DD') : '',
      date_to: end ? dayjs(end).format('YYYY-MM-DD') : '',
      status: this.listing.filterStatus(),
      search: this.listing.searchText() || '',
      page_number: this.listing.currentPage() + 1 || 1,
      page_size: this.listing.pageSize(),
    };

    // console.log(param)

    this.allowanceService.getClaims(param).subscribe({
      next: (res) => {
        this.dataFromApi(res);
      },
      error: (error) => {},
    });
  }

  private dataFromApi(res: any) {
    const items = res.data ?? [];
    this.allRequests.set(this.mapApiData(items));

    // สำหรับกดจาก noti /allowance?voucherNo=A2609#0013
    // ถูกส่งกลับแก้ไข (referred back) เปิดฟอร์มแก้ไขเลย ส่วนอนุมัติ/ปฏิเสธ (สถานะสุดท้าย) เปิดแค่ดูรายละเอียด
    if (this.pendingOpenVoucherNo) {
      const match = this.allRequests().find((r) => r.claimNo === this.pendingOpenVoucherNo);
      if (match) {
        this.pendingOpenVoucherNo = null;
        if (this.isEditableClaim(match.status)) this.editRequest(match.id);
        else this.viewRequest(match);
      }
    }

    this.listing.totalItems.set(res.pagination.total ?? 0);
    this.listing.totalPages.set(res.pagination.totalPages ?? 1);
    this.listing.currentPage.set((res.pagination.page ?? 1) - 1);
  }

  private mapApiData(items: MealAllowanceClaim[] | null | undefined): any[] {
    return (items ?? []).map((item) => ({
      ...item,
      id: Number(item.claimId ?? 0),
      claimId: Number(item.claimId ?? 0),
      claimNo: item.voucherNo ?? '',
      typeId: 0,
      createDate: item.createdAt?.split('T')[0] ?? item.claimDate ?? '',
      status: this.mapStatus(item.status, item.approvalSteps),
      amount: Number(item.totalAmount ?? 0),
      items: (item.details ?? []).map((detail) => ({
        date: detail.work_date?.split('T')[0] ?? '',
        timeIn: detail.actual_checkin ?? '',
        timeOut: detail.actual_checkout ?? '',
        description: detail.description ?? '',
        hours: Number(detail.extra_hours ?? 0),
        amount: Number(detail.rate_amount ?? 0),
        selected: false,
      })),
      rejectedAt:
        item.rejectedAt ??
        (item as any).rejected_at ??
        (item as any).rejectedDate ??
        (item as any).rejected_date ??
        (item as any).statusUpdatedAt ??
        (item as any).status_updated_at ??
        item.updatedAt ??
        (item as any).updated_at ??
        null,
    }));
  }

  private mapStatus(
    status: string | null | undefined,
    approvalSteps: MealAllowanceApprovalStep[] = [],
  ): string {
    if (!status) return '';

    const normalizedStatus = status.trim().toLowerCase().replace(/[_-]+/g, ' ');
    let displayStatus: string;

    if (normalizedStatus === 'pending') {
      displayStatus = 'New';
    } else if (normalizedStatus === 'referred back') {
      displayStatus = 'Referred Back';
    } else {
      displayStatus = normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
    }

    if (this.isApprovalInProgress(normalizedStatus, approvalSteps)) {
      return 'Under Approval';
    }

    return displayStatus;
  }

  private isApprovalInProgress(
    status: string,
    approvalSteps: MealAllowanceApprovalStep[],
  ): boolean {
    if (status !== 'pending' || !approvalSteps?.length) return false;

    const stepsByNumber = new Map<number, MealAllowanceApprovalStep[]>();
    for (const step of approvalSteps) {
      const stepNo = Number(step.step_no);
      if (!Number.isFinite(stepNo)) continue;
      const approvers = stepsByNumber.get(stepNo) ?? [];
      approvers.push(step);
      stepsByNumber.set(stepNo, approvers);
    }

    const steps = [...stepsByNumber.values()];
    if (!steps.length) return false;

    const isStepApproved = (approvers: MealAllowanceApprovalStep[]) =>
      approvers.some((step) => step.status?.trim().toLowerCase() === 'approved');
    const hasApprovedStep = steps.some(isStepApproved);
    const areAllStepsApproved = steps.every(isStepApproved);

    return hasApprovedStep && !areAllStepsApproved;
  }

  openModal(claimId?: number) {
    if (claimId) {
      const result = this.allRequests().find((item) => item.id === claimId);
      this.selectedRequest = result;
      // console.log("result: ", result)
    }
    this.isModalOpen = true;
  }

  editRequest(targetId: number) {
    this.openModal(targetId);
  }

  viewRequest(claim: any) {
    const user = this.authService.userData() ?? {};
    const claimId = Number(claim.claimId ?? claim.id);

    this.selectedDetailItem.set({
      requestId: claimId,
      requestNo: claim.claimNo ?? claim.voucherNo ?? `#${claimId}`,
      requestDate: claim.claimDate ?? claim.createDate,
      requestBy: {
        name: claim.employeeName ?? user.NAMETH ?? user.NAMEENG ?? claim.employeeCode ?? '-',
        employeeId: claim.employeeCode ?? user.CODEMPID ?? '-',
        department: claim.departmentName ?? user.DEPARTMENT ?? '-',
        company: claim.companyName ?? user.COMPANY_NAME ?? '-',
        profileImage: claim.employeeImageUrl ?? undefined,
      },
      requestType: 'ค่าเบี้ยเลี้ยง',
      typeId: claim.typeId ?? 0,
      requestDetail: `จำนวน ${claim.items?.length ?? claim.details?.length ?? 0} รายการ`,
      remark: claim.remark ?? '',
      amount: claim.amount ?? claim.totalAmount ?? 0,
      status: this.toApprovalStatus(claim.status),
      rawStatus: claim.status ?? '',
      type: 'allowance',
      originalData: {
        ...claim,
        claimID: claim.claimID ?? claim.claimId ?? claim.id,
      },
    });
  }

  closeDetail() {
    this.selectedDetailItem.set(null);
    this.clearAutoOpenQueryParams();
  }

  private toApprovalStatus(status: string): 'Pending' | 'Approved' | 'Rejected' | 'Referred Back' {
    switch (status?.trim().toLowerCase().replace(/[_-]+/g, ' ')) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'referred back':
        return 'Referred Back';
      default:
        return 'Pending';
    }
  }

  deleteRequest(claim: any) {
    // console.log(claim);
    this.swalService
      .confirm(
        'ยืนยันการลบรายการเบิกทั้งหมด?',
        undefined,
        `
            <div style="display:flex; align-items:center; gap:8px; justify-content:center">
                <span style="font-size:14px; color:#94a3b8">เลขที่การเบิก</span>
                <span style="font-size:16px; font-weight:700; color:#4f6ef7">${claim.claimNo}</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px; justify-content:center">
                <span style="font-size:14px; color:#94a3b8">จำนวนรายการ</span>
                <span style="font-size:16px; font-weight:700; color:#ef4444">${claim.details.length} รายการ</span>
            </div>
        `,
      )
      .then((result) => {
        if (result.isConfirmed) {
          this.allowanceService.deleteClaim(Number(claim.id)).subscribe({
            next: () => {
              this.swalService.success('ลบรายการสำเร็จ');
              this.loadData();
            },
            error: () => this.swalService.error('เกิดข้อผิดพลาดในการลบรายการ'),
          });
        }
      });
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedRequest = '';
    this.clearAutoOpenQueryParams();
    this.loadData();
  }

  /** เคลียร์ query string (claimId/voucherNo/_t) ที่ค้างจากตอนกดเข้ามาจาก toast noti */
  private clearAutoOpenQueryParams() {
    if (!Object.keys(this.route.snapshot.queryParams).length) return;
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }

  clearFilters() {
    clearListingFilters(this.listing);
    this.dateRange = null;
    this.loadData();
  }

  trackByReqId(_index: number, req: AllowanceRequest): string {
    return req.id;
  }

  trackByRowId(
    _index: number,
    itemOrRow:
      AllowanceRequest | FlatAllowanceRow | import('@tanstack/angular-table').Row<FlatAllowanceRow>,
  ): string {
    const item = 'original' in itemOrRow ? itemOrRow.original : itemOrRow;
    const id = (item as FlatAllowanceRow).requestId || (item as AllowanceRequest).id || 'row';
    const date = (item as FlatAllowanceRow).date || '';
    return `${id}-${date}-${_index}`;
  }
  getStatusClass(status: string) {
    return StatusUtil.getStatusBadgeClaims(status.toLowerCase());
  }

  isEditableClaim(status: string): boolean {
    const normalizedStatus = status?.trim().toLowerCase().replace(/[_-]+/g, ' ');
    return ['pending', 'new', 'referred back'].includes(normalizedStatus);
  }

  isRejectedClaim(status: string): boolean {
    return status?.trim().toLowerCase() === 'rejected';
  }

  setPageSize(size: number) {
    this.listing.pageSize.set(size);
    this.listing.currentPage.set(0);
    this.loadData();
  }

  goToPage(page: number) {
    this.listing.currentPage.set(page);
    this.loadData();
  }
}
