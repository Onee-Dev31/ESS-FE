import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  createAngularTable,
  getCoreRowModel,
  SortingState,
} from '@tanstack/angular-table';
import { ItRequestDetailModal } from '../../components/modals/it-request-detail-modal/it-request-detail-modal';
import { ApprovalItem } from '../../interfaces/approval.interface';
import { ApprovalsHelperService } from '../../services/approvals-helper.service';
import { DateUtilityService } from '../../services/date-utility.service';
import { ExportService } from '../../services/export';
import { ToastService } from '../../services/toast';
import { DialogService } from '../../services/dialog';
import { LoadingService } from '../../services/loading';
import { ErrorService } from '../../services/error';
import { ItServiceService } from '../../services/it-service.service';
import { APPROVAL_STATUS_TABS } from '../../config/constants';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { createListingState, createListingComputeds, TableSortHelper } from '../../utils/listing.util';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { listAnimation } from '../../animations/animations';

/** หน้าจัดการรายการอนุมัติ (Approval IT Request) แสดงข้อมูลในรูปแบบตารางพร้อมระบบกรองและค้นหา */
@Component({
  selector: 'app-approval-it-request',
  standalone: true,
  imports: [CommonModule, FormsModule, ItRequestDetailModal, PageHeaderComponent, PaginationComponent, SkeletonComponent, EmptyStateComponent],
  animations: [listAnimation],
  templateUrl: './approval-it-request.html',
  styleUrl: './approval-it-request.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ApprovalItRequestComponent implements OnInit {
  private approvalsHelper = inject(ApprovalsHelperService);
  private dateUtil = inject(DateUtilityService);
  private exportService = inject(ExportService);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);
  private loadingService = inject(LoadingService);
  private errorService = inject(ErrorService);
  private itService = inject(ItServiceService);
  private route = inject(ActivatedRoute);

  isLoading = this.loadingService.loading('approvals-it-list');
  isExporting = this.loadingService.loading('export');

  listing = createListingState();
  tabs = APPROVAL_STATUS_TABS;

  isModalOpen = signal<boolean>(false);
  selectedItem = signal<ApprovalItem | null>(null);
  initialAction = signal<'Approved' | 'Rejected' | 'Referred Back' | null>(null);

  approvals = signal<ApprovalItem[]>([]);
  sorting = signal<SortingState>([{ id: 'requestNo', desc: true }]);

  pageTitle = signal<string>('IT Request Approvals');
  showExportMenu = signal<boolean>(false);

  constructor() {
    this.listing.filterStatus.set('Pending');
  }

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.loadingService.start('approvals-it-list');

    this.itService.getApprovalItRequests().subscribe({
      next: (data: any[]) => {
        // Map raw IT Request data to ApprovalItem interface
        const mappedData: ApprovalItem[] = (data || []).map(item => this.mapToApprovalItem(item));
        this.approvals.set(mappedData);
        this.loadingService.stop('approvals-it-list');
      },
      error: (err) => {
        this.errorService.handle(err, { component: 'ApprovalItRequest', action: 'fetch-data' });
        this.loadingService.stop('approvals-it-list');
        // Handle mock or empty state for now if API fails
        this.approvals.set([]);
      }
    });

    // Fallback stop in case of no response
    setTimeout(() => {
      if (this.loadingService.isLoading('approvals-it-list')) {
        this.loadingService.stop('approvals-it-list');
      }
    }, 5000);
  }

  private mapToApprovalItem(item: any): ApprovalItem {
    // Modify Mapping according to the actual IT Request API response
    return {
      requestNo: item.id || item.requestNo || 'IT-XXX',
      requestDate: item.createDate ? this.dateUtil.formatDateToThaiMonth(item.createDate) : '-',
      requestBy: {
        name: item.requester?.name || item.requestBy?.name || 'Unknown',
        employeeId: item.requester?.employeeId || item.requestBy?.employeeId || '-',
        department: item.requester?.department || item.requestBy?.department || '-',
        company: item.requester?.company || item.requestBy?.company || 'Onee',
        position: '-',
        profileImage: 'assets/images/user-placeholder.png'
      },
      requestType: 'IT Request',
      typeId: 99,
      requestDetail: item.description || item.requestDetail || 'IT Service/Problem Request',
      amount: item.amount || 0,
      status: this.approvalsHelper.mapStatus(item.status),
      rawStatus: item.status || 'Pending',
      type: 'it-request',
      originalData: item
    };
  }

  comps = createListingComputeds(
    this.approvals,
    this.listing,
    (item, search, status) => {
      const matchStatus = !status || item.status === status;
      const matchSearch = !search ||
        item.requestNo.toLowerCase().includes(search.toLowerCase()) ||
        item.requestBy.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.originalData?.requestFor || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.originalData?.requestCategory || '').toLowerCase().includes(search.toLowerCase()) ||
        item.requestDetail.toLowerCase().includes(search.toLowerCase());
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
      { accessorKey: 'requestNo', header: 'Request No.' },
      { accessorKey: 'requestDate', header: 'Request Date' },
      { accessorKey: 'requestBy', header: 'Request By' },
      { id: 'requestFor', header: 'Request For' },
      { id: 'requestCategory', header: 'Request Category' },
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

  viewRequestDetail(item: ApprovalItem) {
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

  getStatusClass(status: string): string {
    return this.approvalsHelper.getStatusClass(status);
  }

  trackByRowId(index: number, itemOrRow: ApprovalItem | import('@tanstack/angular-table').Row<ApprovalItem>): string {
    const item = 'original' in itemOrRow ? itemOrRow.original : itemOrRow;
    return `${item.requestNo}-${index}`;
  }

  toggleExportMenu() {
    this.showExportMenu.set(!this.showExportMenu());
  }

  async exportPDF() {
    this.showExportMenu.set(false);
    this.loadingService.start('export');
    try {
      await this.exportService.exportToPDF('approvals-it-table', 'approvals-it-request');
      this.toastService.success('Export PDF สำเร็จ');
    } catch (error) {
      this.errorService.handle(error, { component: 'ApprovalItRequest', action: 'export-pdf' });
    } finally {
      this.loadingService.stop('export');
    }
  }

  async exportExcel() {
    this.showExportMenu.set(false);
    this.loadingService.start('export');
    try {
      const data = this.table.getRowModel().rows.map(row => ({
        requestNo: row.original.requestNo,
        requestDate: row.original.requestDate,
        requestBy: row.original.requestBy.name,
        requestFor: row.original.originalData?.requestFor || '-',
        requestCategory: row.original.originalData?.requestCategory || '-',
        status: row.original.status
      }));

      const columns = [
        { header: 'Request No.', key: 'requestNo', width: 20 },
        { header: 'Request Date', key: 'requestDate', width: 20 },
        { header: 'Request By', key: 'requestBy', width: 20 },
        { header: 'Request For', key: 'requestFor', width: 20 },
        { header: 'Request Category', key: 'requestCategory', width: 30 },
        { header: 'Status', key: 'status', width: 15 }
      ];

      await this.exportService.exportToExcel(data, columns, 'approvals-it-request');
      this.toastService.success('Export Excel สำเร็จ');
    } catch (error) {
      this.errorService.handle(error, { component: 'ApprovalItRequest', action: 'export-excel' });
    } finally {
      this.loadingService.stop('export');
    }
  }

  print() {
    this.showExportMenu.set(false);
    this.loadingService.start('export');
    try {
      this.exportService.printElement('approvals-it-table');
      this.toastService.success('เปิดหน้าพิมพ์แล้ว');
    } catch (error) {
      this.errorService.handle(error, { component: 'ApprovalItRequest', action: 'print' });
    } finally {
      this.loadingService.stop('export');
    }
  }
}
