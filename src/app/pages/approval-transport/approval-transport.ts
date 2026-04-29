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
import { ApprovalTransportService } from '../../services/approval-transport.service';
import { APPROVAL_STATUS_TABS } from '../../config/approval.config';
import { StatusUtil } from '../../utils/status.util';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-approval-transport',
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
  templateUrl: './approval-transport.html',
  styleUrl: './approval-transport.scss',
})
export class ApprovalTransportComponent implements OnInit {
  readonly pageTitle = signal('อนุมัติค่ารถ');

  dateUtil = inject(DateUtilityService);
  private approvalTransportService = inject(ApprovalTransportService);
  private exportService = inject(ExportService);
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);
  private errorService = inject(ErrorService);
  private authService = inject(AuthService);

  isLoading = this.loadingService.loading('approvals-transport-list');
  isExporting = this.loadingService.loading('export');
  isRefreshing = signal<boolean>(false);
  private initialized = false;

  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<{ fileName: string; url: string; date: string; type: string }[]>([]);

  profileLightbox = signal<{ url: string; name: string } | null>(null);

  isModalOpen = signal<boolean>(false);
  selectedItem = signal<ApprovalItem | null>(null);
  initialAction = signal<'Approved' | 'Rejected' | 'Referred Back' | null>(null);

  approvals = signal<any[]>([]);
  showExportMenu = signal<boolean>(false);
  listing = createListingState();
  transportTabs = APPROVAL_STATUS_TABS;

  constructor() {
    this.listing.filterStatus.set('Pending');
  }

  ngOnInit() {
    this.loadClaims();
  }

  refresh() {
    this.loadClaims();
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

  toggleExportMenu() {
    this.showExportMenu.set(!this.showExportMenu());
  }

  async exportPDF() {
    this.showExportMenu.set(false);
    this.loadingService.start('export');
    try {
      await this.exportService.exportToPDF('approvals-table', 'approvals-transport');
      this.toastService.success('Export PDF สำเร็จ');
    } catch (error) {
      this.errorService.handle(error, { component: 'ApprovalTransport', action: 'export-pdf' });
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
        { header: 'รหัสพนักงาน', key: 'employeeId', width: 15 },
        { header: 'รายละเอียด', key: 'requestDetail', width: 35 },
        { header: 'จำนวนเงิน', key: 'amount', width: 15 },
        { header: 'สถานะ', key: 'status', width: 15 },
      ];

      await this.exportService.exportToExcel(data, columns, 'approvals-transport');
      this.toastService.success('Export Excel สำเร็จ');
    } catch (error) {
      this.errorService.handle(error, { component: 'ApprovalTransport', action: 'export-excel' });
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
      this.errorService.handle(error, { component: 'ApprovalTransport', action: 'print' });
    } finally {
      this.loadingService.stop('export');
    }
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
    return `${item.requestNo}-${index}`;
  }

  getTransportClaim(item: ApprovalItem): any | null {
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
    this.loadClaims();
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

  openPreview(claim: any) {
    if (!claim.attachments?.length) return;
    this.previewFiles.set(
      claim.attachments.map((a: any) => ({
        fileName: a.fileName,
        url: this.approvalTransportService.getFileUrl(a.fileUrl),
        date: claim.submittedAt,
        type: a.fileType,
      })),
    );
    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }

  private buildDetailSummary(details: any[]): string {
    if (!details?.length) return 'ค่าเดินทาง';
    if (details.length === 1) return details[0].description;
    return `รายการเดินทาง ${details.length} รายการ`;
  }

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
      requestType: 'ค่ารถ',
      typeId: 0,
      requestDetail: this.buildDetailSummary(claim.details),
      claimStatus: claim.status,
      remark: claim.remark || '',
      amount: claim.totalAmount,
      status: this.mapClaimStatus(claim.status),
      rawStatus: claim.status.toLowerCase(),
      type: 'vehicle',
      originalData: {
        ...claim,
        employeeImageUrl: `https://empimg.oneeclick.co:8048/employeeimage/${claim.employeeCode}.jpg`,
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

  loadClaims() {
    const adUser = this.authService.currentUser() || '';
    if (!this.initialized) {
      this.loadingService.start('approvals-transport-list');
    } else {
      this.isRefreshing.set(true);
    }
    this.approvalTransportService.getApprovals(adUser).subscribe({
      next: (res) => {
        this.approvals.set(res.data.map((c: any) => this.mapClaimToApproval(c)));
        this.listing.currentPage.set(0);
        this.loadingService.stop('approvals-transport-list');
        this.isRefreshing.set(false);
        this.initialized = true;
      },
      error: (error) => {
        this.loadingService.stop('approvals-transport-list');
        this.isRefreshing.set(false);
        this.errorService.handle(error, { component: 'ApprovalTransport', action: 'load-claims' });
      },
    });
  }
}
