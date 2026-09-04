import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApprovalDetailModalComponent } from '../../components/modals/approval-detail-modal/approval-detail-modal';
import { FilePreviewModalComponent } from '../../components/modals/file-preview-modal/file-preview-modal';
import { ApprovalItem } from '../../interfaces/approval.interface';
import { TaxiService } from '../../services/taxi.service';
import { DateUtilityService } from '../../services/date-utility.service';
import { ExportService } from '../../services/export';
import { ToastService } from '../../services/toast';
import { LoadingService } from '../../services/loading';
import { ErrorService } from '../../services/error';
import { APPROVAL_STATUS_TABS } from '../../config/constants';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { createListingState, createListingComputeds } from '../../utils/listing.util';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { StatusLabelPipe } from '../../pipes/status-label.pipe';
import { listAnimation } from '../../animations/animations';
import { StatusUtil } from '../../utils/status.util';
import { NzInputModule } from 'ng-zorro-antd/input';
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
  dateUtil = inject(DateUtilityService);
  private exportService = inject(ExportService);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);
  private errorService = inject(ErrorService);

  isLoading = this.loadingService.loading('approvals-list');
  isExporting = this.loadingService.loading('export');
  isRefreshing = signal<boolean>(false);
  private initialized = false;

  approvals = signal<ApprovalItem[]>([]);
  selectedItems = signal<Set<number>>(new Set());
  showExportMenu = signal<boolean>(false);

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
    this.loadTaxiClaims(voucherNo);
  }

  /** โหลดรายการคำขออนุมัติค่าแท็กซี่จาก API */
  loadTaxiClaims(autoOpenVoucherNo?: string) {
    const adUser = this.authService.currentUser() || '';

    if (!this.initialized) {
      this.loadingService.start('approvals-list');
    } else {
      this.isRefreshing.set(true);
    }

    this.taxiApiService.getApprovals(adUser, autoOpenVoucherNo).subscribe({
      next: (res) => {
        const mapped = (res.data ?? []).map((c: any) => this.mapClaimToApproval(c));
        this.approvals.set(mapped);
        this.listing.currentPage.set(0);
        this.listing.totalItems.set(
          mapped.filter(
            (item: ApprovalItem) =>
              !this.listing.filterStatus() || item.status === this.listing.filterStatus(),
          ).length,
        );

        this.loadingService.stop('approvals-list');
        this.isRefreshing.set(false);
        this.initialized = true;

        if (autoOpenVoucherNo) {
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

  private mapClaimToApproval(claim: any): ApprovalItem {
    const items: TaxiTripItem[] = (claim.details ?? []).map((d: any) => {
      const fromName: string = d.other_from?.trim() || d.location_from_name || '';
      const toName: string = d.other_to?.trim() || d.location_to_name || '';
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
              },
        ),
      };
    });

    return {
      requestId: claim.claimId,
      requestNo: claim.voucherNo ?? `#${claim.claimId}`,
      requestDate: claim.claimDate,
      requestBy: {
        name: claim.employeeName ?? claim.employeeCode,
        employeeId: claim.employeeCode,
        department: claim.departmentName ?? '-',
        company: claim.companyName ?? '-',
      },
      requestType: 'ค่าแท็กซี่',
      typeId: 0,
      requestDetail: `${items.length} รายการ`,
      remark: claim.remark || '',
      amount: claim.totalAmount ?? 0,
      status: this.mapClaimStatus(claim.status),
      rawStatus: (claim.status || '').toLowerCase(),
      type: 'taxi',
      originalData: { ...claim, items },
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

  comps = createListingComputeds(this.approvals, this.listing, (item, search, status) => {
    const matchStatus = !status || item.status === status;
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
    return matchStatus && !!matchSearch;
  });

  setActiveTab(tab: string) {
    this.listing.filterStatus.set(tab);
    this.listing.currentPage.set(0);
    this.listing.totalItems.set(
      this.approvals().filter(
        (item) => !this.listing.filterStatus() || item.status === this.listing.filterStatus(),
      ).length,
    );
    this.selectedItems.set(new Set());
  }

  getTabCount(tab: string) {
    return this.approvals().filter((item) => item.status === tab).length;
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
    this.loadTaxiClaims();
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

  toggleExportMenu() {
    this.showExportMenu.set(!this.showExportMenu());
  }

  async exportPDF() {
    this.showExportMenu.set(false);
    this.loadingService.start('export');
    try {
      await this.exportService.exportToPDF('approvals-table', 'approvals');
      this.toastService.success('Export PDF สำเร็จ');
    } catch (error) {
      this.errorService.handle(error, { component: 'ApprovalsTaxi', action: 'export-pdf' });
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
        department: item.requestBy.department,
        requestDetail: item.requestDetail,
        amount: item.amount,
        status: item.status,
      }));

      const columns = [
        { header: 'เลขที่เอกสาร', key: 'requestNo', width: 15 },
        { header: 'วันที่สร้าง', key: 'requestDate', width: 15 },
        { header: 'ชื่อ-นามสกุล', key: 'requestBy', width: 20 },
        { header: 'รหัสพนักงาน', key: 'employeeId', width: 15 },
        { header: 'แผนก', key: 'department', width: 20 },
        { header: 'รายละเอียด', key: 'requestDetail', width: 20 },
        { header: 'จำนวนเงิน', key: 'amount', width: 15 },
        { header: 'สถานะ', key: 'status', width: 15 },
      ];

      await this.exportService.exportToExcel(data, columns, 'approvals-taxi');
      this.toastService.success('Export Excel สำเร็จ');
      this.selectedItems.set(new Set());
    } catch (error) {
      this.errorService.handle(error, { component: 'ApprovalsTaxi', action: 'export-excel' });
    } finally {
      this.loadingService.stop('export');
    }
  }

  print() {
    this.showExportMenu.set(false);
    this.loadingService.start('export');
    try {
      this.exportService.printElement('approvals-table');
      this.toastService.success('เปิดหน้าพิมพ์แล้ว');
    } catch (error) {
      this.errorService.handle(error, { component: 'ApprovalsTaxi', action: 'print' });
    } finally {
      this.loadingService.stop('export');
    }
  }

  get currentTabItems() {
    return this.comps.filteredData();
  }

  isAllSelected() {
    const current = this.currentTabItems;
    return current.length > 0 && current.every((item) => this.selectedItems().has(item.requestId));
  }

  isSomeSelected() {
    const current = this.currentTabItems;
    return (
      current.some((item) => this.selectedItems().has(item.requestId)) && !this.isAllSelected()
    );
  }

  isChecked(requestId: number) {
    return this.selectedItems().has(requestId);
  }

  toggleSelectAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set(this.selectedItems());

    this.currentTabItems.forEach((item) => {
      if (checked) next.add(item.requestId);
      else next.delete(item.requestId);
    });

    this.selectedItems.set(next);
  }

  toggleSelect(requestId: number, checked: boolean) {
    const next = new Set(this.selectedItems());
    if (checked) next.add(requestId);
    else next.delete(requestId);
    this.selectedItems.set(next);
  }
}
