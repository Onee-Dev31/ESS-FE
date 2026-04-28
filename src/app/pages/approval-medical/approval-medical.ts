import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApprovalDetailModalComponent } from '../../components/modals/approval-detail-modal/approval-detail-modal';
import { FilePreviewModalComponent } from '../../components/modals/file-preview-modal/file-preview-modal';
import { ApprovalItem } from '../../interfaces/approval.interface';
import { MedicalClaim } from '../../interfaces/medical.interface';
import { MedicalService } from '../../services/medical.service';
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
import dayjs from 'dayjs';
import { MONTHS_TH } from '../../constants/date.constant';
import { StatusUtil } from '../../utils/status.util';
import { NzInputModule } from 'ng-zorro-antd/input';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { AuthService } from '../../services/auth.service';

/** หน้าจัดการรายการอนุมัติค่ารักษาพยาบาล */
@Component({
  selector: 'app-approvals',
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
  templateUrl: './approval-medical.html',
  styleUrl: './approval-medical.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalMedicalComponent implements OnInit {
  private medicalApiService = inject(MedicalService);
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
  Comps = createListingComputeds(this.approvals, this.listing);

  medicalTabs = APPROVAL_STATUS_TABS.filter((t) => t !== 'Referred Back');
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

  readonly pageTitle = signal('อนุมัติค่ารักษาพยาบาล');

  constructor() {
    this.listing.filterStatus.set('Pending');
  }

  ngOnInit() {
    const voucherNo = this.route.snapshot.queryParamMap.get('voucherNo') || '';
    this.loadMedicalClaims(voucherNo);
  }

  /** โหลดข้อมูลค่ารักษาพยาบาลจาก API */
  loadMedicalClaims(autoOpenVoucherNo?: string) {
    const fromYear = parseInt(this.fromYear());
    const toYear = parseInt(this.toYear());
    const keyword = this.listing.searchText().trim() || undefined;

    if (!this.initialized) {
      this.loadingService.start('approvals-list');
    } else {
      this.isRefreshing.set(true);
    }

    this.medicalApiService
      .getClaims({
        from_month: this.fromMonth() + 1,
        from_year: isNaN(fromYear) ? undefined : fromYear,
        to_month: this.toMonth() + 1,
        to_year: isNaN(toYear) ? undefined : toYear,
        keyword,
      })
      .subscribe({
        next: (res) => {
          const mapped = res.data.map((c) => this.mapClaimToApproval(c));
          this.approvals.set(mapped);
          this.listing.currentPage.set(0);
          this.listing.totalItems.set(
            mapped.filter(
              (item) => !this.listing.filterStatus() || item.status === this.listing.filterStatus(),
            ).length,
          );

          this.loadingService.stop('approvals-list');
          this.isRefreshing.set(false);
          this.initialized = true;

          if (autoOpenVoucherNo) {
            const target = mapped.find((item) => item.requestNo === autoOpenVoucherNo);
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

  private mapClaimToApproval(claim: MedicalClaim): ApprovalItem {
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
      requestType: 'ค่ารักษาพยาบาล',
      typeId: claim.expenseTypeId,
      requestDetail: `${claim.expenseTypeName} — ${claim.diseaseName} (${claim.hospitalName})`,
      remark: claim.remark || '',
      amount: claim.requestedAmount,
      status: this.mapClaimStatus(claim.status),
      rawStatus: claim.status,
      type: 'medical',
      originalData: claim,
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
    this.loadMedicalClaims();
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
    this.loadMedicalClaims();
  }

  onStatusUpdated() {
    this.refresh();
  }

  getStatusClass(status: string) {
    return StatusUtil.getStatusBadgeClaims(status.toLowerCase());
  }

  openPreview(claim: MedicalClaim) {
    if (!claim.attachments?.length) return;
    this.previewFiles.set(
      claim.attachments.map((a) => ({
        fileName: a.fileName,
        url: this.medicalApiService.getFileUrl(a.fileUrl),
        date: claim.claimDate,
        type: a.fileType,
      })),
    );
    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }

  onImgError(event: Event) {
    const avatar = (event.target as HTMLElement).closest('.emp-avatar') as HTMLElement;
    if (avatar) avatar.classList.add('img-error');
  }

  openProfileImage(claim: MedicalClaim) {
    if (!claim.employeeImageUrl) return;
    this.profileLightbox.set({
      url: claim.employeeImageUrl,
      name: claim.employeeName ?? claim.employeeCode,
    });
  }

  closeProfileLightbox() {
    this.profileLightbox.set(null);
  }

  getMedicalClaim(item: ApprovalItem): MedicalClaim | null {
    return (item.originalData as MedicalClaim)?.claimId != null
      ? (item.originalData as MedicalClaim)
      : null;
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
      this.errorService.handle(error, { component: 'Approvals', action: 'export-pdf' });
    } finally {
      this.loadingService.stop('export');
    }
  }

  async exportExcel() {
    // console.log(this.selectedItems());
    this.showExportMenu.set(false);
    this.loadingService.start('export');

    const adUser = this.authService.currentUser() || '';
    const fromYear = parseInt(this.fromYear());
    const toYear = parseInt(this.toYear());

    // map display status → API status
    const statusMap: Record<string, string> = {
      Pending: 'PENDING',
      Approved: 'APPROVED',
      Rejected: 'REJECTED',
      'Referred Back': 'REFERRED_BACK',
    };
    const activeStatus = this.listing.filterStatus();
    const apiStatus = activeStatus ? statusMap[activeStatus] : undefined;

    const exportParams = {
      approver_aduser: adUser,
      status: apiStatus,
      from_month: this.fromMonth() + 1,
      from_year: isNaN(fromYear) ? undefined : fromYear,
      to_month: this.toMonth() + 1,
      to_year: isNaN(toYear) ? undefined : toYear,
      keyword: this.listing.searchText().trim() || undefined,
      claim_ids: this.selectedItems().size > 0 ? [...this.selectedItems()] : undefined,
    };

    this.medicalApiService.exportClaimsExcel(exportParams).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `approvals-medical-${dayjs().format('YYYYMMDD')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this.toastService.success('Export Excel สำเร็จ');
        this.selectedItems.set(new Set());
        this.loadingService.stop('export');
      },
      error: (error) => {
        console.error('[Export Excel] error:', error?.status, error);
        if (error?.status === 404) {
          this.toastService.warning('ไม่พบข้อมูลที่ตรงกับเงื่อนไข');
        } else {
          this.toastService.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        }
        this.loadingService.stop('export');
      },
    });
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
