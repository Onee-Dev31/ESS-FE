import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApprovalDetailModalComponent } from '../../components/modals/approval-detail-modal/approval-detail-modal';
import { FilePreviewModalComponent } from '../../components/modals/file-preview-modal/file-preview-modal';
import { ApprovalItem } from '../../interfaces/approval.interface';
import { TaxiService } from '../../services/taxi.service';
import { DateUtilityService } from '../../services/date-utility.service';
import { LoadingService } from '../../services/loading';
import { ErrorService } from '../../services/error';
import { ExportService } from '../../services/export';
import { ToastService } from '../../services/toast';
import { APPROVAL_STATUS_TABS } from '../../config/constants';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { createListingState, createListingComputeds } from '../../utils/listing.util';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { StatusLabelPipe } from '../../pipes/status-label.pipe';
import { listAnimation } from '../../animations/animations';
import { StatusUtil } from '../../utils/status.util';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { AuthService } from '../../services/auth.service';

interface TaxiTripItem {
  date: string;
  description: string;
  locationFrom: string;
  locationTo: string;
  amount: number;
  attachments: { fileName: string; fileUrl: string; fileType: string }[];
}

/** หน้าจัดการรายการอนุมัติค่าแท็กซี่ */
@Component({
  selector: 'app-approval-taxi',
  standalone: true,
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
    PaginationComponent,
  ],
  animations: [listAnimation],
  templateUrl: './approval-taxi.html',
  styleUrl: './approval-taxi.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalTaxiComponent implements OnInit {
  private taxiApiService = inject(TaxiService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  dateUtil = inject(DateUtilityService);
  private loadingService = inject(LoadingService);
  private errorService = inject(ErrorService);
  private exportService = inject(ExportService);
  private toastService = inject(ToastService);

  isLoading = this.loadingService.loading('approvals-list');
  isExporting = this.loadingService.loading('export');
  isRefreshing = signal<boolean>(false);
  private initialized = false;

  approvals = signal<ApprovalItem[]>([]);
  statusCounts = signal<Record<string, number>>({});

  listing = createListingState();

  taxiTabs = APPROVAL_STATUS_TABS.filter((t) => t !== 'Referred Back');

  isModalOpen = signal<boolean>(false);
  selectedItem = signal<ApprovalItem | null>(null);
  initialAction = signal<'Approved' | 'Rejected' | 'Referred Back' | null>(null);

  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<{ fileName: string; url: string; date: string; type: string }[]>([]);

  profileLightbox = signal<{ url: string; name: string } | null>(null);

  readonly pageTitle = signal('อนุมัติค่าแท็กซี่');

  constructor() {
    this.listing.filterStatus.set('Pending');
  }

  ngOnInit() {
    const voucherNo = this.route.snapshot.queryParamMap.get('voucherNo') || '';
    const claimIdParam = this.route.snapshot.queryParamMap.get('claimId');
    const claimId = claimIdParam ? Number(claimIdParam) : undefined;
    this.loadTaxiClaims(voucherNo, claimId);
  }

  /** โหลดรายการคำขออนุมัติค่าแท็กซี่จาก API — คลิกจาก toast (claimId) หรือ voucherNo แล้วเปิด detail อัตโนมัติ */
  loadTaxiClaims(autoOpenVoucherNo?: string, autoOpenClaimId?: number) {
    const excuteBy = this.authService.userData()?.CODEMPID ?? '';
    const selectedStatus = this.listing.filterStatus();
    const hasHrRole = (this.authService.userRole() ?? '')
      .split(',')
      .some((role) => role.trim().toLowerCase() === 'hr');
    const apiStatus = selectedStatus === 'Pending' && !hasHrRole ? 'New' : selectedStatus;
    const displayStatus = this.mapClaimStatus(apiStatus);

    if (!this.initialized) {
      this.loadingService.start('approvals-list');
    } else {
      this.isRefreshing.set(true);
    }

    this.taxiApiService.getTaxiClaimsForApprover(excuteBy, apiStatus).subscribe({
      next: (res) => {
        const claims = res.data ?? [];
        const details = Array.isArray(res.details ?? res.detail) ? (res.details ?? res.detail) : [];
        const mapped = claims.map((c: any) =>
          this.mapClaimToApproval(c, claims.length === 1 ? details : [], displayStatus),
        );
        this.approvals.set(mapped);
        this.statusCounts.set(
          (res.statusCounts ?? []).reduce((counts: Record<string, number>, item: any) => {
            const status = this.mapClaimStatus(item.StatusName ?? item.statusName ?? '');
            counts[status] = Number(item.ClaimCount ?? item.claimCount ?? 0);
            return counts;
          }, {}),
        );
        this.listing.currentPage.set(0);
        this.listing.totalItems.set(mapped.length);

        this.loadingService.stop('approvals-list');
        this.isRefreshing.set(false);
        this.initialized = true;

        if (autoOpenClaimId != null && !Number.isNaN(autoOpenClaimId)) {
          const target = mapped.find(
            (item: ApprovalItem) => Number(item.requestId) === autoOpenClaimId,
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
        this.errorService.handle(error, { component: 'ApprovalsTaxi', action: 'load-claims' });
      },
    });
  }

  private mapClaimToApproval(
    claim: any,
    fallbackDetails: any[] = [],
    displayStatus?: ApprovalItem['status'],
  ): ApprovalItem {
    const claimId = claim.claimId ?? claim.claim_id;
    const voucherNo = claim.voucherNo ?? claim.voucher_no;
    const claimDate = claim.claimDate ?? claim.claim_date;
    const employeeCode = claim.employeeCode ?? claim.employee_code;
    const employeeName = claim.firstname + ' ' + claim.lastname;
    const departmentName = claim.department;
    const companyName = claim.companyName ?? claim.company_name;
    const totalAmount = claim.totalAmount ?? claim.total_amount ?? 0;
    const backendStatus = this.mapClaimStatus(claim.status);
    const employeeImageUrl = employeeCode
      ? `https://empimg.oneeclick.co:8048/employeeimage/${encodeURIComponent(employeeCode)}.jpg`
      : '';
    const items: TaxiTripItem[] = (claim.details ?? fallbackDetails).map((d: any) => {
      const fromName: string =
        d.other_from?.trim() || d.location_from_name || (d.location_from_id === 1 ? 'Office' : '');
      const toName: string =
        d.other_to?.trim() || d.location_to_name || (d.location_to_id === 1 ? 'Office' : '');
      const rawAttachments: any[] = d.attachments ?? [];
      return {
        date: d.work_date ?? '',
        description: d.description ?? '',
        locationFrom: fromName,
        locationTo: toName,
        amount: d.rate_amount ?? 0,
        attachments: rawAttachments.map((a) =>
          typeof a === 'string'
            ? { fileName: a.split('/').pop() ?? a, fileUrl: a, fileType: '' }
            : {
                fileName: a.fileName ?? a.file_name ?? '',
                fileUrl: a.fileUrl ?? a.file_url ?? '',
                fileType: a.fileType ?? a.file_type ?? '',
                createdDate: a.created_at,
              },
        ),
      };
    });

    return {
      requestId: claimId,
      requestNo: voucherNo ?? `#${claimId}`,
      requestDate: claimDate,
      requestBy: {
        name: employeeName,
        employeeId: employeeCode,
        department: departmentName ?? '-',
        company: companyName ?? '-',
      },
      requestType: 'ค่าแท็กซี่',
      typeId: 0,
      requestDetail: `${items.length} รายการ`,
      remark: claim.remark ?? claim.rejection_reason ?? '',
      amount: totalAmount,
      status: displayStatus ?? backendStatus,
      rawStatus: backendStatus.toLowerCase(),
      claimStatus: backendStatus.toLowerCase(),
      type: 'taxi',
      employeeImageUrl,
      originalData: {
        ...claim,
        claimId,
        voucherNo,
        claimDate,
        employeeCode,
        employeeName,
        departmentName,
        companyName,
        totalAmount,
        employeeImageUrl,
        items,
        remark: claim.remark ?? '',
        rejectionReason: claim.rejection_reason ?? '',
      },
    };
  }

  private mapClaimStatus(status: string): 'Pending' | 'Approved' | 'Rejected' | 'Referred Back' {
    switch (status?.toUpperCase()) {
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

  refresh() {
    this.loadTaxiClaims();
  }

  comps = createListingComputeds(this.approvals, this.listing, (item, search, _status) => {
    const claim = this.getTaxiClaim(item);
    const matchSearch =
      !search ||
      item.requestNo.toLowerCase().includes(search) ||
      item.requestBy.name.toLowerCase().includes(search) ||
      (claim?.items as TaxiTripItem[] | undefined)?.some(
        (i) =>
          i.description.toLowerCase().includes(search) ||
          i.locationFrom.toLowerCase().includes(search) ||
          i.locationTo.toLowerCase().includes(search),
      );
    return !!matchSearch;
  });

  async exportExcel() {
    this.loadingService.start('export');
    try {
      const items = this.comps.filteredData();
      if (!items.length) {
        this.toastService.warning('No data for Export Excel');
        return;
      }

      const data = items.map((item) => {
        const claim = this.getTaxiClaim(item);
        const trips = (claim?.items as TaxiTripItem[] | undefined) ?? [];

        return {
          requestNo: item.requestNo,
          requestDate: item.requestDate,
          requestBy: item.requestBy.name,
          employeeId: item.requestBy.employeeId,
          department: item.requestBy.department,
          requestType: item.requestType,
          locationFrom: trips.map((trip) => trip.locationFrom || '-').join('\n'),
          locationTo: trips.map((trip) => trip.locationTo || '-').join('\n'),
          amount: item.amount,
          status: item.status,
        };
      });

      const columns = [
        { header: 'เลขที่เอกสาร', key: 'requestNo', width: 18 },
        { header: 'วันที่สร้าง', key: 'requestDate', width: 16 },
        { header: 'รหัสพนักงาน', key: 'employeeId', width: 15 },
        { header: 'ชื่อพนักงาน', key: 'requestBy', width: 24 },
        { header: 'แผนก', key: 'department', width: 24 },
        { header: 'ประเภท', key: 'requestType', width: 16 },
        { header: 'จากที่ไหน', key: 'locationFrom', width: 24 },
        { header: 'ไปที่ไหน', key: 'locationTo', width: 24 },
        { header: 'จำนวนเงิน', key: 'amount', width: 14 },
        { header: 'สถานะ', key: 'status', width: 14 },
      ];

      await this.exportService.exportToExcel(data, columns, 'approvals-taxi');
      this.toastService.success('Export Excel success');
    } catch (error) {
      this.errorService.handle(error, { component: 'ApprovalsTaxi', action: 'export-excel' });
    } finally {
      this.loadingService.stop('export');
    }
  }

  setActiveTab(tab: string) {
    this.listing.filterStatus.set(tab);
    this.listing.currentPage.set(0);
    this.loadTaxiClaims();
  }

  getTabCount(tab: string) {
    return (
      this.statusCounts()[tab] ?? this.approvals().filter((item) => item.status === tab).length
    );
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.listing.searchText.set(input.value);
    this.listing.currentPage.set(0);
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
    this.loadTaxiClaims();
  }

  /** เคลียร์ query string (claimId/voucherNo/_t) ที่ค้างจากตอนกดเข้ามาจาก toast noti */
  private clearAutoOpenQueryParams() {
    if (!Object.keys(this.route.snapshot.queryParams).length) return;
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }

  onStatusUpdated() {
    this.refresh();
  }

  getStatusClass(status: string) {
    return StatusUtil.getStatusBadgeClaims(status.toLowerCase());
  }

  getTaxiClaim(item: ApprovalItem): any | null {
    return (item.originalData as any)?.claimId != null ? item.originalData : null;
  }

  getAttachmentCount(claim: any): number {
    return (claim.items as TaxiTripItem[]).reduce((sum, i) => sum + i.attachments.length, 0);
  }

  openPreview(claim: any) {
    const files = (claim.items as TaxiTripItem[])
      .filter((i) => i.attachments.length)
      .flatMap((i) =>
        i.attachments.map((a) => ({
          fileName: a.fileName,
          url: this.taxiApiService.getFileUrl(a.fileUrl),
          date: i.date,
          type: a.fileType,
        })),
      );
    if (!files.length) return;
    this.previewFiles.set(files);
    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }

  onImgError(event: Event) {
    const avatar = (event.target as HTMLElement).closest('.emp-avatar') as HTMLElement;
    if (avatar) avatar.classList.add('img-error');
  }

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

  trackByRowId(index: number, item: ApprovalItem): string {
    return `${item.requestNo}-${index}`;
  }

  goToPage(page: number) {
    this.listing.currentPage.set(page);
  }

  setPageSize(size: number) {
    this.listing.pageSize.set(size);
    this.listing.currentPage.set(0);
  }
}
