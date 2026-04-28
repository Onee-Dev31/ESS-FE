import { Component, inject, OnInit, signal } from '@angular/core';
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
import { ApprovalItem } from '../../interfaces/approval.interface';
import { createListingComputeds, createListingState } from '../../utils/listing.util';
import dayjs from 'dayjs';
import { ApprovalAllowanceService } from '../../services/approval-allowance';
import { APPROVAL_STATUS_TABS } from '../../config/approval.config';
import { StatusUtil } from '../../utils/status.util';
import { AuthService } from '../../services/auth.service';

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

  approvals = signal<any[]>([]);
  showExportMenu = signal<boolean>(false);
  listing = createListingState();
  medicalTabs = APPROVAL_STATUS_TABS.filter((t) => t !== 'Referred Back');

  constructor() {
    this.listing.filterStatus.set('Pending');
  }

  ngOnInit() {
    this.loadAllowanceClaims();
  }

  refresh() {
    this.loadAllowanceClaims();
  }

  comps = createListingComputeds(this.approvals, this.listing, (item, search, status) => {
    const matchStatus = !status || item.status === status;
    const matchSearch =
      !search ||
      item.requestNo.toLowerCase().includes(search) ||
      item.requestBy.name.toLowerCase().includes(search) ||
      item.requestDetail.toLowerCase().includes(search);
    return matchStatus && matchSearch;
  });

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
      this.errorService.handle(error, { component: 'Approvals', action: 'export-pdf' });
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
        requestType: item.requestType,
        requestDetail: item.requestDetail,
        amount: item.amount,
        status: item.status,
      }));

      const columns = [
        { header: 'เลขที่เอกสาร', key: 'requestNo', width: 15 },
        { header: 'วันที่สร้าง', key: 'requestDate', width: 15 },
        { header: 'รหัสพนักงาน', key: 'employeeId', width: 15 },
        { header: 'ประเภท', key: 'requestType', width: 15 },
        { header: 'รายละเอียด', key: 'requestDetail', width: 35 },
        { header: 'จำนวนเงิน', key: 'amount', width: 15 },
        { header: 'สถานะ', key: 'status', width: 15 },
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

  getTabCount(tab: string) {
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
    this.loadAllowanceClaims();
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
        employeeImageUrl: `https://empimg.oneeclick.co:8048/employeeimage/${claim.employeeCode}.jpg`,
        expenseTypeName: 'เบิกค่าเบี้ยเลี้ยง',
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

  // GET
  /** โหลดข้อมูลค่ารักษาพยาบาลจาก API */
  loadAllowanceClaims(autoOpenVoucherNo?: string, autoOpenClaimId?: string) {
    const adUser = this.authService.currentUser() || '';
    if (!this.initialized) {
      this.loadingService.start('approvals-list');
    } else {
      this.isRefreshing.set(true);
    }
    this.approvalAllowanceService.getApprovals(adUser, autoOpenVoucherNo).subscribe({
      next: (res) => {
        // console.log(res);
        this.approvals.set(res.data.map((c: any) => this.mapClaimToApproval(c)));
        this.listing.currentPage.set(0);
        this.loadingService.stop('approvals-list');
        this.isRefreshing.set(false);
        this.initialized = true;
      },
      error: (error) => {
        this.loadingService.stop('approvals-list');
        this.isRefreshing.set(false);
        this.errorService.handle(error, { component: 'ApprovalsM', action: 'load-claims' });
      },
    });
  }
}
