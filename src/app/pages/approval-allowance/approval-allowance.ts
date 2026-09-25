import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { DateUtilityService } from '../../services/date-utility.service';
import { ExportService } from '../../services/export';
import { ToastService } from '../../services/toast';
import { LoadingService } from '../../services/loading';
import { ErrorService } from '../../services/error';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApprovalDetailModalComponent } from '../../components/modals/approval-detail-modal/approval-detail-modal';
import { FilePreviewModalComponent } from '../../components/modals/file-preview-modal/file-preview-modal';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { StatusLabelPipe } from '../../pipes/status-label.pipe';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { ApprovalItem } from '../../interfaces/approval.interface';
import { createListingComputeds, createListingState } from '../../utils/listing.util';
import dayjs from 'dayjs';
import { ApprovalAllowanceService } from '../../services/approval-allowance';
import { APPROVAL_STATUS_TABS } from '../../config/approval.config';
import { StatusUtil } from '../../utils/status.util';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-approval-allowance',
  imports: [
    CommonModule,
    FormsModule,
    ApprovalDetailModalComponent,
    FilePreviewModalComponent,
    PageHeaderComponent,
    SkeletonComponent,
    EmptyStateComponent,
    StatusLabelPipe,
    NzInputModule,
    NzSelectModule,
  ],
  templateUrl: './approval-allowance.html',
  styleUrl: './approval-allowance.scss',
})
export class ApprovalAllowanceComponent implements OnInit {
  readonly pageTitle = signal('อนุมัติค่าเบี้ยเลี้ยง');

  dateUtil = inject(DateUtilityService);
  private approvalAllowanceService = inject(ApprovalAllowanceService);
  private exportService = inject(ExportService);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);
  private errorService = inject(ErrorService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  isLoading = this.loadingService.loading('approvals-list');
  isExporting = this.loadingService.loading('export');
  isRefreshing = signal<boolean>(false);
  private initialized = false;

  fromMonth = signal<number>(0);
  fromYear = signal<string>((dayjs().year() - 1).toString());
  toMonth = signal<number>(11);
  toYear = signal<string>(dayjs().year().toString());

  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<{ fileName: string; url: string; date: string; type: string }[]>([]);

  profileLightbox = signal<{ url: string; name: string } | null>(null);

  isModalOpen = signal<boolean>(false);
  selectedItem = signal<ApprovalItem | null>(null);
  initialAction = signal<'Approved' | 'Rejected' | 'Referred Back' | null>(null);

  linkedVoucherNo = signal<string | null>(null);
  approvals = signal<any[]>([]);
  summary = signal<{
    pending: number;
    approved: number;
    rejected: number;
    referredBack: number;
  } | null>(null);
  listing = createListingState();
  medicalTabs = APPROVAL_STATUS_TABS;

  constructor() {
    this.listing.filterStatus.set('Pending');
  }

  ngOnInit() {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const voucherNo = params['voucherNo'] || params['ticketNumber'];
      const claimId = params['claimId'];
      if (voucherNo || claimId || params['_t']) {
        this.listing.filterStatus.set('Pending');
        this.listing.searchText.set('');
        this.listing.currentPage.set(0);
      }
      this.linkedVoucherNo.set(voucherNo ?? null);
      this.loadAllowanceClaims(voucherNo, claimId);
    });
  }

  refresh() {
    this.loadAllowanceClaims();
  }

  comps = createListingComputeds(this.approvals, this.listing, (item, search, status) => {
    if (item.rawStatus === 'cancelled') return false;
    const matchStatus = !status || item.status === status;
    const matchSearch =
      !search ||
      item.requestNo.toLowerCase().includes(search) ||
      item.requestBy.name.toLowerCase().includes(search) ||
      item.requestDetail.toLowerCase().includes(search);
    return matchStatus && matchSearch;
  });

  async exportExcel() {
    this.loadingService.start('export');
    try {
      const items = this.comps.filteredData();
      if (!items.length) {
        this.toastService.warning('ไม่พบข้อมูลสำหรับ Export Excel');
        return;
      }

      const data = items.map((item) => ({
        requestNo: item.requestNo,
        requestDate: item.requestDate,
        requestBy: item.requestBy.name,
        employeeId: item.requestBy.employeeId,
        department: item.requestBy.department,
        requestType: item.requestType,
        requestDetail: this.formatClaimDetails(item),
        amount: item.amount,
        status: item.status,
      }));

      const columns = [
        { header: 'เลขที่เอกสาร', key: 'requestNo', width: 15 },
        { header: 'วันที่เบิก', key: 'requestDate', width: 20 },
        { header: 'รหัสพนักงาน', key: 'employeeId', width: 15 },
        { header: 'ประเภท', key: 'requestType', width: 15 },
        { header: 'รายละเอียด', key: 'requestDetail', width: 35 },
        { header: 'จำนวนเงิน', key: 'amount', width: 15 },
        { header: 'สถานะ', key: 'status', width: 15 },
      ];

      await this.exportService.exportToExcel(data, columns, 'approvals-allowance');
      this.toastService.success('Export Excel สำเร็จ');
    } catch (error) {
      this.errorService.handle(error, { component: 'Approvals', action: 'export-excel' });
    } finally {
      this.loadingService.stop('export');
    }
  }

  private formatClaimDetails(item: ApprovalItem): string {
    const claim = item.originalData as any;
    const details = Array.isArray(claim?.details) ? claim.details : [];
    if (!details.length) return item.requestDetail || '';

    return details
      .map((detail: any) => detail.description || '')
      .filter(Boolean)
      .join('\n');
  }

  // FUNCTION
  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.listing.searchText.set(input.value);
    this.listing.currentPage.set(0);
  }

  setActiveTab(tab: string) {
    this.listing.filterStatus.set(tab);
    this.listing.currentPage.set(0);
  }

  get showEmailResubmitHint(): boolean {
    return (
      this.listing.filterStatus() === 'Pending' &&
      this.comps.paginatedData().length === 0 &&
      this.linkedVoucherNo() !== null
    );
  }

  get showResubmitHint(): boolean {
    return (
      !this.showEmailResubmitHint &&
      this.listing.filterStatus() === 'Pending' &&
      this.comps.paginatedData().length === 0 &&
      (this.summary()?.referredBack ?? 0) > 0
    );
  }

  getTabCount(tab: string) {
    const s = this.summary();
    if (s) {
      const map: Record<string, number> = {
        Pending: s.pending,
        Approved: s.approved,
        Rejected: s.rejected,
        'Referred Back': s.referredBack,
      };
      return map[tab] ?? 0;
    }
    return this.approvals().filter((item) => item.status === tab).length;
  }

  trackByRowId(index: number, item: ApprovalItem): string {
    return `${item.requestNo}-${index}`;
  }

  getAllowanceClaim(item: ApprovalItem): any | null {
    // console.log(item);
    return (item.originalData as any)?.claimID != null ? (item.originalData as any) : null;
  }

  getStatusClass(status: string) {
    return StatusUtil.getStatusBadgeClaims(status.toLowerCase());
  }

  viewDetail(item: ApprovalItem) {
    this.selectedItem.set(item);
    this.initialAction.set(null);
    this.isModalOpen.set(true);
  }

  openActionModal(item: ApprovalItem, action: 'Approved' | 'Rejected' | 'Referred Back') {
    this.selectedItem.set(item);
    this.initialAction.set(action);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedItem.set(null);
    this.initialAction.set(null);
    this.clearAutoOpenQueryParams();
    this.loadAllowanceClaims();
  }

  /** เคลียร์ query string (claimId/voucherNo/_t) ที่ค้างจากตอนกดเข้ามาจาก toast noti */
  private clearAutoOpenQueryParams() {
    if (!Object.keys(this.route.snapshot.queryParams).length) return;
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }

  onStatusUpdated() {
    this.refresh();
  }

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (!img.src.includes('user.png')) {
      img.src = 'user.png';
    }
  }

  // PREVIEW-PROFILE
  openProfileImage(claim: any) {
    if (!claim.employeeImageUrl) return;
    this.profileLightbox.set({
      url: claim.employeeImageUrl,
      name: claim.employeeName ?? claim.employeeCode,
    });
  }
  closeProfileLightbox() {
    this.profileLightbox.set(null);
  }

  // PREVIEW
  openPreview(claim: any) {
    if (!claim.attachments?.length) return;
    this.previewFiles.set(
      claim.attachments.map((a: any) => ({
        fileName: a.fileName,
        url: this.approvalAllowanceService.getFileUrl(a.fileUrl),
        date: claim.claimDate,
        type: a.fileType,
      })),
    );
    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }

  // MAP
  private mapClaimToApproval(claim: any): ApprovalItem {
    return {
      requestId: claim.claimID,
      requestNo: claim.voucherNo ?? `#${claim.claimID}`,
      requestDate: claim.submittedAt,
      requestBy: {
        name: claim.employeeName ?? claim.employeeCode,
        employeeId: claim.employeeCode,
        department: claim.departmentName ?? '-',
        company: claim.companyName ?? '-',
      },
      requestType: 'ค่าเบี้ยเลี้ยง',
      typeId: claim.expenseTypeId,
      requestDetail: `${claim.expenseTypeName} — ${claim.diseaseName} (${claim.hospitalName})`,
      claimStatus: claim.claimStatus,
      remark: claim.remark || '',
      amount: claim.totalAmount,
      status: this.mapClaimStatus(claim.status),
      rawStatus: claim.status.toLowerCase(),
      type: 'allowance',
      originalData: {
        ...claim,
        employeeImageUrl: `${environment.employeeImageUrl}/${claim.employeeCode}.jpg`,
        expenseTypeName: 'เบิกค่าเบี้ยเลี้ยง',
      },
    };
  }

  private mapClaimStatus(status: string): 'Pending' | 'Approved' | 'Rejected' | 'Referred Back' {
    switch (status?.toUpperCase().replace(/ /g, '_')) {
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'REFERRED_BACK':
        return 'Referred Back';
      default:
        return 'Pending';
    }
  }

  // GET
  /** โหลดข้อมูลค่ารักษาพยาบาลจาก API — คลิกจาก toast (claimId/voucherNo) แล้วเปิด detail อัตโนมัติ */
  loadAllowanceClaims(autoOpenVoucherNo?: string, autoOpenClaimId?: string) {
    const adUser = this.authService.currentUser() || '';
    if (!this.initialized) {
      this.loadingService.start('approvals-list');
    } else {
      this.isRefreshing.set(true);
    }
    this.approvalAllowanceService.getApprovals(adUser, autoOpenVoucherNo).subscribe({
      next: (res) => {
        const mapped = res.data.map((c: any) => this.mapClaimToApproval(c));
        this.approvals.set(mapped);
        if (res.summary) this.summary.set(res.summary);
        this.listing.currentPage.set(0);
        this.loadingService.stop('approvals-list');
        this.isRefreshing.set(false);
        this.initialized = true;

        if (autoOpenClaimId) {
          const target = mapped.find(
            (item: ApprovalItem) => String(item.requestId) === String(autoOpenClaimId),
          );
          if (target) this.viewDetail(target);
        } else if (autoOpenVoucherNo) {
          const target = mapped.find((item: ApprovalItem) => item.requestNo === autoOpenVoucherNo);
          if (target) this.viewDetail(target);
        }
      },
      error: (error) => {
        this.loadingService.stop('approvals-list');
        this.isRefreshing.set(false);
        this.errorService.handle(error, { component: 'ApprovalsM', action: 'load-claims' });
      },
    });
  }
}
