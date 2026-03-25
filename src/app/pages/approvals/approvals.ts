import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  createAngularTable,
  getCoreRowModel,
  SortingState,
} from '@tanstack/angular-table';
import { ApprovalDetailModalComponent } from '../../components/modals/approval-detail-modal/approval-detail-modal';
import { FilePreviewModalComponent } from '../../components/modals/file-preview-modal/file-preview-modal';
import { ApprovalItem } from '../../interfaces/approval.interface';
import { MedicalClaim } from '../../interfaces/medical.interface';
import { ApprovalsHelperService } from '../../services/approvals-helper.service';
import { MedicalApiService } from '../../services/medical-api.service';
import { DateUtilityService } from '../../services/date-utility.service';
import { ExportService } from '../../services/export';
import { ToastService } from '../../services/toast';
import { LoadingService } from '../../services/loading';
import { ErrorService } from '../../services/error';
import { APPROVAL_STATUS_TABS } from '../../config/constants';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { createListingState, createListingComputeds, TableSortHelper } from '../../utils/listing.util';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { StatusLabelPipe } from '../../pipes/status-label.pipe';
import { listAnimation } from '../../animations/animations';
import dayjs from 'dayjs';
import { MONTHS_TH } from '../../constants/date.constant';
import { StatusUtil } from '../../utils/status.util';

/** หน้าจัดการรายการอนุมัติ (Approvals) แสดงข้อมูลในรูปแบบตารางพร้อมระบบกรองและค้นหา */
@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule, ApprovalDetailModalComponent, FilePreviewModalComponent, PageHeaderComponent, PaginationComponent, SkeletonComponent, EmptyStateComponent, StatusLabelPipe],
  animations: [listAnimation],
  templateUrl: './approvals.html',
  styleUrl: './approvals.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ApprovalsComponent implements OnInit {
  private approvalsHelper = inject(ApprovalsHelperService);
  private medicalApiService = inject(MedicalApiService);
  private dateUtil = inject(DateUtilityService);
  private exportService = inject(ExportService);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);
  private errorService = inject(ErrorService);
  private route = inject(ActivatedRoute);

  isLoading = this.loadingService.loading('approvals-list');
  isExporting = this.loadingService.loading('export');
  isRefreshing = signal<boolean>(false);
  private initialized = false;

  listing = createListingState();
  tabs = APPROVAL_STATUS_TABS;
  medicalTabs = APPROVAL_STATUS_TABS.filter(t => t !== 'Referred Back');
  months = MONTHS_TH;

  fromMonth = signal<number>(0);
  fromYear = signal<string>((dayjs().year() - 1).toString());
  toMonth = signal<number>(11);
  toYear = signal<string>(dayjs().year().toString());

  isModalOpen = signal<boolean>(false);
  selectedItem = signal<ApprovalItem | null>(null);
  initialAction = signal<'Approved' | 'Rejected' | 'Referred Back' | null>(null);

  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<{ fileName: string; url: string; date: string; type: string }[]>([]);

  profileLightbox = signal<{ url: string; name: string } | null>(null);

  approvals = signal<ApprovalItem[]>([]);
  sorting = signal<SortingState>([{ id: 'requestNo', desc: true }]);

  pageTitle = signal<string>('Pending Approvals');
  category: 'all' | 'medical' = 'all';
  showExportMenu = signal<boolean>(false);

  constructor() {
    this.listing.filterStatus.set('Pending');
  }

  /** เริ่มต้นโหลดข้อมูลและจัดการ Route Parameter */
  ngOnInit() {
    this.route.data.subscribe(data => {
      this.category = data['category'] || 'all';
      this.pageTitle.set(this.category === 'medical' ? 'อนุมัติค่ารักษาพยาบาล' : 'Pending Approvals');
      if (this.category === 'medical') {
        this.loadMedicalClaims();
      } else {
        this.loadingService.start('approvals-list');
        setTimeout(() => { this.loadingService.stop('approvals-list'); }, 1500);
        this.refresh();
      }
    });
  }

  /** โหลดข้อมูลค่ารักษาพยาบาลจาก API */
  loadMedicalClaims() {
    const fromYear = parseInt(this.fromYear());
    const toYear = parseInt(this.toYear());
    const status = this.listing.filterStatus() || undefined;
    const keyword = this.listing.searchText().trim() || undefined;

    if (!this.initialized) {
      this.loadingService.start('approvals-list');
    } else {
      this.isRefreshing.set(true);
    }

    this.medicalApiService.getClaims({
      from_month: this.fromMonth() + 1,
      from_year: isNaN(fromYear) ? undefined : fromYear,
      to_month: this.toMonth() + 1,
      to_year: isNaN(toYear) ? undefined : toYear,
      status,
      keyword,
    }).subscribe({
      next: (res) => {
        this.approvals.set(res.data.map(c => this.mapClaimToApproval(c)));
        this.listing.currentPage.set(0);
        this.loadingService.stop('approvals-list');
        this.isRefreshing.set(false);
        this.initialized = true;
      },
      error: (error) => {
        this.loadingService.stop('approvals-list');
        this.isRefreshing.set(false);
        this.errorService.handle(error, { component: 'ApprovalsM', action: 'load-claims' });
      }
    });
  }

  private mapClaimToApproval(claim: MedicalClaim): ApprovalItem {
    return {
      requestId: claim.claimId,
      requestNo: claim.voucherNo ?? `#${claim.claimId}`,
      requestDate: claim.claimDate,
      requestBy: {
        name: claim.employeeName ?? claim.employeeCode,
        employeeId: claim.employeeCode,
        department: claim.departmentName ?? '-',
        company: claim.companyName ?? '-'
      },
      requestType: 'ค่ารักษาพยาบาล',
      typeId: claim.expenseTypeId,
      requestDetail: `${claim.expenseTypeName} — ${claim.diseaseName} (${claim.hospitalName})`,
      amount: claim.requestedAmount,
      status: this.mapClaimStatus(claim.status),
      rawStatus: claim.status,
      type: 'medical',
      originalData: claim
    };
  }

  private mapClaimStatus(status: string): 'Pending' | 'Approved' | 'Rejected' | 'Referred Back' {
    switch (status?.toUpperCase()) {
      case 'APPROVED': return 'Approved';
      case 'REJECTED': return 'Rejected';
      case 'REFERRED_BACK': return 'Referred Back';
      default: return 'Pending';
    }
  }

  /** รีเฟรชข้อมูลรายการอนุมัติจาก Service */
  refresh() {
    if (this.category === 'medical') {
      this.loadMedicalClaims();
      return;
    }
    this.approvalsHelper.getApprovals(this.category).subscribe(allData => {
      this.approvals.set(allData);
    });
  }

  /** จัดการการคำนวณ Filter ข้อมูล (ค้นหาและสถานะ) */
  comps = createListingComputeds(
    this.approvals,
    this.listing,
    (item, search, status) => {
      const matchStatus = !status || item.status === status;
      const matchSearch = !search ||
        item.requestNo.toLowerCase().includes(search) ||
        item.requestBy.name.toLowerCase().includes(search) ||
        item.requestDetail.toLowerCase().includes(search);
      return matchStatus && matchSearch;
    }
  );

  sortedData = computed(() => {
    let list = [...this.comps.filteredData()];
    const sortState = this.sorting()[0];
    if (sortState) {
      return this.approvalsHelper.sortData(list, sortState.id, sortState.desc);
    }
    return list;
  });

  paginatedRows = computed(() => {
    const start = this.listing.currentPage() * this.listing.pageSize();
    return this.sortedData().slice(start, start + this.listing.pageSize());
  });

  table = createAngularTable(() => ({
    data: this.paginatedRows(),
    columns: [
      { accessorKey: 'requestNo', header: 'Request No' },
      { accessorKey: 'requestDate', header: 'Date Created' },
      { accessorKey: 'requestBy', header: 'Requester Info' },
      { accessorKey: 'requestType', header: 'Type' },
      { accessorKey: 'requestDetail', header: 'Description' },
      { accessorKey: 'amount', header: 'Amount' },
      { accessorKey: 'status', header: 'Status' },
    ],
    state: { sorting: this.sorting() },
    onSortingChange: (updaterOrValue) => {
      const next = typeof updaterOrValue === 'function' ? updaterOrValue(this.sorting()) : updaterOrValue;
      this.sorting.set(next);
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  }));

  setActiveTab(tab: string) {
    this.listing.filterStatus.set(tab);
    this.listing.currentPage.set(0);
  }

  getTabCount(tab: string) {
    return this.approvals().filter(item => item.status === tab).length;
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.listing.searchText.set(input.value);
    this.listing.currentPage.set(0);
  }

  setPageSize(size: number) {
    this.listing.pageSize.set(size);
    this.listing.currentPage.set(0);
  }

  goToPage(page: number) {
    this.listing.currentPage.set(page);
  }

  toggleSort(columnId: string) {
    TableSortHelper.toggleSort(this.table, columnId);
  }

  getSortIcon(columnId: string) {
    return TableSortHelper.getSortIcon(this.table, columnId);
  }

  /** แสดงรายละเอียดรายการที่เลือกใน Modal */
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
  }

  onStatusUpdated() {
    this.refresh();
  }

  getTimeAgo(date: string): string {
    return this.dateUtil.getTimeAgo(date);
  }

  getStatusClass(status: string) {
    return StatusUtil.getStatusBadgeClaims(status.toLowerCase());
  }
  openPreview(claim: MedicalClaim) {
    if (!claim.attachments?.length) return;
    this.previewFiles.set(claim.attachments.map(a => ({
      fileName: a.fileName,
      url: this.medicalApiService.getFileUrl(a.fileUrl),
      date: claim.claimDate,
      type: a.fileType
    })));
    this.isPreviewModalOpen.set(true);
  }

  closePreview() { this.isPreviewModalOpen.set(false); }

  onImgError(event: Event) {
    const avatar = (event.target as HTMLElement).closest('.emp-avatar') as HTMLElement;
    if (avatar) avatar.classList.add('img-error');
  }

  openProfileImage(claim: MedicalClaim) {
    if (!claim.employeeImageUrl) return;
    this.profileLightbox.set({ url: claim.employeeImageUrl, name: claim.employeeName ?? claim.employeeCode });
  }

  closeProfileLightbox() { this.profileLightbox.set(null); }

  getMedicalClaim(item: ApprovalItem): MedicalClaim | null {
    return (item.originalData as MedicalClaim)?.claimId != null
      ? item.originalData as MedicalClaim
      : null;
  }

  trackByRowId(index: number, itemOrRow: ApprovalItem | import('@tanstack/angular-table').Row<ApprovalItem>): string {
    const item = 'original' in itemOrRow ? itemOrRow.original : itemOrRow;
    return `${item.requestNo}-${index}`;
  }

  toggleExportMenu() {
    this.showExportMenu.set(!this.showExportMenu());
  }

  /** ส่งออกตารางรายการปัจจุบันเป็น PDF */
  async exportPDF() {
    this.showExportMenu.set(false);
    this.loadingService.start('export');
    try {
      await this.exportService.exportToPDF('approvals-table', 'approvals');
      this.toastService.success('Export PDF สำเร็จ');
    } catch (error) {
      this.errorService.handle(error, { component: 'Approvals', action: 'export-pdf' });
    } finally {
      this.loadingService.stop('export');
    }
  }

  /** ส่งออกข้อมูลปัจจุบันเป็น Excel (.xlsx) */
  async exportExcel() {
    this.showExportMenu.set(false);
    this.loadingService.start('export');
    try {
      const data = this.table.getRowModel().rows.map(row => ({
        requestNo: row.original.requestNo,
        requestDate: row.original.requestDate,
        requestBy: row.original.requestBy.name,
        employeeId: row.original.requestBy.employeeId,
        department: row.original.requestBy.department,
        requestType: row.original.requestType,
        requestDetail: row.original.requestDetail,
        amount: row.original.amount,
        status: row.original.status
      }));

      const columns = [
        { header: 'เลขที่เอกสาร', key: 'requestNo', width: 15 },
        { header: 'วันที่สร้าง', key: 'requestDate', width: 15 },
        { header: 'รหัสพนักงาน', key: 'employeeId', width: 15 },
        { header: 'ประเภท', key: 'requestType', width: 15 },
        { header: 'รายละเอียด', key: 'requestDetail', width: 35 },
        { header: 'จำนวนเงิน', key: 'amount', width: 15 },
        { header: 'สถานะ', key: 'status', width: 15 }
      ];

      await this.exportService.exportToExcel(data, columns, 'approvals-medical');
      this.toastService.success('Export Excel สำเร็จ');
    } catch (error) {
      this.errorService.handle(error, { component: 'Approvals', action: 'export-excel' });
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
      this.errorService.handle(error, { component: 'Approvals', action: 'print' });
    } finally {
      this.loadingService.stop('export');
    }
  }
}
