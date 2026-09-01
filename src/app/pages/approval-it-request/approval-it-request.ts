import { CommonModule, Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { createAngularTable, getCoreRowModel } from '@tanstack/angular-table';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSelectModule } from 'ng-zorro-antd/select';
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import { listAnimation } from '../../animations/animations';
import { ItRequestDetailModal } from '../../components/modals/it-request-detail-modal/it-request-detail-modal';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { PageLoaderComponent } from '../../components/shared/page-loader/page-loader';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { APPROVAL_STATUS_TABS } from '../../config/approval.config';
import { ApprovalItem } from '../../interfaces/approval.interface';
import { ApprovalsHelperService } from '../../services/approvals-helper.service';
import { AuthService } from '../../services/auth.service';
import { DateUtilityService } from '../../services/date-utility.service';
import { ErrorService } from '../../services/error';
import { ItServiceService } from '../../services/it-service.service';
import { LoadingService } from '../../services/loading';
import { SignalrService } from '../../services/signalr.service';
import { ToastService } from '../../services/toast';
import { createListingComputeds, createListingState } from '../../utils/listing.util';

@Component({
  selector: 'app-approval-it-request',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ItRequestDetailModal,
    PageHeaderComponent,
    PageLoaderComponent,
    PaginationComponent,
    EmptyStateComponent,
    NzInputModule,
    NzDatePickerModule,
    NzSelectModule,
  ],
  animations: [listAnimation],
  templateUrl: './approval-it-request.html',
  styleUrl: './approval-it-request.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalItRequestComponent implements OnInit {
  private approvalsHelper = inject(ApprovalsHelperService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private errorService = inject(ErrorService);
  private itService = inject(ItServiceService);
  private loadingService = inject(LoadingService);
  private location = inject(Location);
  private route = inject(ActivatedRoute);
  private signalrService = inject(SignalrService);
  private toastService = inject(ToastService);

  dateUtil = inject(DateUtilityService);
  isLoading = this.loadingService.loading('approvals-it-list');
  isExporting = this.loadingService.loading('export');
  listing = createListingState();
  tabs = APPROVAL_STATUS_TABS;

  readonly currentYear = new Date().getFullYear();
  readonly showDateRangeFilter = true;
  dateRange = signal<Date[]>([
    new Date(this.currentYear, 0, 1),
    new Date(this.currentYear, 11, 31),
  ]);
  appliedDateFrom = signal(`${this.currentYear}-01-01`);
  appliedDateTo = signal(`${this.currentYear}-12-31`);
  approvalStageFilter = signal<'all' | 'approver' | 'director'>('all');

  approvals = signal<ApprovalItem[]>([]);
  highlightedTicketId = signal<number | null>(null);
  isModalOpen = signal(false);
  selectedItem = signal<ApprovalItem | null>(null);
  initialAction = signal<'Approved' | 'Rejected' | 'Referred Back' | null>(null);
  pageTitle = signal('IT Request Approvals');
  canFilterApprovalStage = computed(() =>
    (this.authService.userRole() ?? '')
      .split(',')
      .map((role) => role.trim().toLowerCase())
      .includes('it-director'),
  );
  canSeeWaitingApprover = computed(() =>
    (this.authService.userRole() ?? '')
      .split(',')
      .map((role) => role.trim().toLowerCase())
      .includes('system-admin'),
  );

  comps = createListingComputeds(this.approvals, this.listing, (item, search, status) => {
    const matchStatus = !status || item.status === status;
    const stage = this.approvalStageFilter();
    const matchApprovalStage =
      stage === 'all' ||
      (stage === 'director' && !!item.isPendingItDirectorApproval) ||
      (stage === 'approver' && !item.isPendingItDirectorApproval);
    const matchSearch =
      !search ||
      item.requestNo.toLowerCase().includes(search) ||
      item.requestBy.name.toLowerCase().includes(search);

    return matchStatus && matchApprovalStage && matchSearch;
  });

  statusCounts = computed(() => {
    const counts = { Pending: 0, Approved: 0, Rejected: 0, ReferredBack: 0 };
    for (const item of this.approvals()) {
      const key = item.status === 'Referred Back' ? 'ReferredBack' : item.status;
      counts[key as keyof typeof counts]++;
    }
    return counts;
  });

  totalItems = computed(() => this.comps.totalItems());

  paginatedRows = computed(() => {
    const start = this.listing.currentPage() * this.listing.pageSize();
    return this.comps.filteredData().slice(start, start + this.listing.pageSize());
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
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  }));

  constructor() {
    this.listing.filterStatus.set('Pending');
  }

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.loadApprovals(Number(params['ticketId']) || null, params['ticketNumber'] || null);
    });

    this.signalrService.ticketFocusTrigger
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const id = Number(value);
        this.loadApprovals(
          Number.isFinite(id) && id > 0 ? id : null,
          id > 0 ? null : String(value),
        );
      });

    this.signalrService
      .on('NewTicketForApproval')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refresh());
  }

  searchByDateRange(): void {
    const [from, to] = this.dateRange() ?? [];
    if (!from || !to) {
      this.toastService.warning('กรุณาระบุช่วงวันที่ให้ครบถ้วน');
      return;
    }
    if (from > to) {
      this.toastService.warning('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด');
      return;
    }

    this.appliedDateFrom.set(this.formatDateParam(from));
    this.appliedDateTo.set(this.formatDateParam(to));
    this.listing.currentPage.set(0);
    this.loadApprovals();
  }

  private formatDateParam(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  refresh(): void {
    this.loadApprovals();
  }

  private loadApprovals(ticketId: number | null = null, ticketNumber: string | null = null): void {
    this.loadingService.start('approvals-it-list');
    this.itService
      .getApprovalItRequestsByDateRange({
        empno: this.authService.userData().CODEMPID,
        dateFrom: this.appliedDateFrom(),
        dateTo: this.appliedDateTo(),
      })
      .subscribe({
        next: (response) => {
          const data = (response?.data ?? []).map((item: any) =>
            this.mapToApprovalItem(this.normalizeApiItem(item)),
          );
          console.log(response, data);
          this.approvals.set(data);
          this.focusTicket(data, ticketId, ticketNumber);
          this.loadingService.stop('approvals-it-list');
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.loadingService.stop('approvals-it-list');
          this.errorService.handle(error, {
            component: 'ApprovalItRequest',
            action: 'load-year-range',
          });
        },
      });
  }

  private normalizeApiItem(item: any): any {
    const parseArray = (value: unknown): any[] => {
      if (Array.isArray(value)) return value;
      if (typeof value !== 'string' || !value.trim()) return [];
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    return {
      ...item,
      requester: item.requester ?? {
        name: item['requester.name'],
        employeeId: item['requester.employeeId'],
        department: item['requester.department'],
        phone: item['requester.phone'],
        company: item['requester.company'],
      },
      attachments: parseArray(item.attachments),
      main: parseArray(item.main),
      basic: parseArray(item.basic),
      specific: parseArray(item.specific),
    };
  }

  private mapToApprovalItem(item: any): ApprovalItem {
    return {
      requestId: item.id,
      requestNo: item.ticketNumber || item.requestNo || 'IT-XXX',
      requestDate: item.createDate || null,
      requestBy: {
        name: item.requester?.name || 'Unknown',
        employeeId: item.requester?.employeeId || '-',
        department: item.requester?.department || '-',
        company: item.requester?.company || 'Onee',
        position: '-',
        phone: item.requester?.phone || '-',
        profileImage: 'assets/images/user-placeholder.png',
      },
      requestType: 'IT Request',
      typeId: 99,
      requestDetail: item.description || 'IT Service/Problem Request',
      amount: item.amount || 0,
      status: this.approvalsHelper.mapStatus(item.status),
      rawStatus: item.status || 'Pending',
      type: 'it-request',
      originalData: item,
      isPendingItDirectorApproval: item.isPendingItDirectorApproval,
    };
  }

  private focusTicket(
    data: ApprovalItem[],
    ticketId: number | null,
    ticketNumber: string | null,
  ): void {
    const item = data.find(
      (approval) =>
        (ticketId != null && approval.requestId === ticketId) ||
        (!!ticketNumber && approval.requestNo === ticketNumber),
    );
    if (!item) return;

    this.listing.filterStatus.set(item.status);
    const sortedIndex = this.comps
      .filteredData()
      .findIndex((approval) => approval.requestId === item.requestId);
    this.listing.currentPage.set(
      sortedIndex < 0 ? 0 : Math.floor(sortedIndex / this.listing.pageSize()),
    );
    this.viewRequestDetail(item);

    if (ticketId != null || ticketNumber) {
      this.location.replaceState(this.location.path().split('?')[0]);
    }

    setTimeout(() => {
      this.highlightedTicketId.set(item.requestId);
      document
        .getElementById(`approval-row-${item.requestId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => this.highlightedTicketId.set(null), 10000);
    }, 100);
  }

  setActiveTab(tab: string): void {
    if (this.listing.filterStatus() === tab) return;
    this.listing.filterStatus.set(tab);
    this.listing.currentPage.set(0);
  }

  setApprovalStageFilter(stage: 'all' | 'approver' | 'director'): void {
    this.approvalStageFilter.set(stage);
    this.listing.currentPage.set(0);
  }

  getTabCount(tab: string): number {
    const key = tab === 'Referred Back' ? 'ReferredBack' : tab;
    return this.statusCounts()[key as keyof ReturnType<typeof this.statusCounts>] ?? 0;
  }

  onSearch(event: Event): void {
    this.listing.searchText.set((event.target as HTMLInputElement).value);
    this.listing.currentPage.set(0);
  }

  setPageSize(size: number): void {
    this.listing.pageSize.set(size);
    this.listing.currentPage.set(0);
  }

  goToPage(page: number): void {
    this.listing.currentPage.set(page);
  }

  viewRequestDetail(item: ApprovalItem): void {
    this.selectedItem.set(item);
    this.initialAction.set(null);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedItem.set(null);
    this.initialAction.set(null);
  }

  onStatusUpdated(): void {
    this.closeModal();
    this.refresh();
  }

  getStatusClass(status: string): string {
    return this.approvalsHelper.getStatusClass(status);
  }

  trackByRowId(
    index: number,
    itemOrRow: ApprovalItem | import('@tanstack/angular-table').Row<ApprovalItem>,
  ): string {
    const item = 'original' in itemOrRow ? itemOrRow.original : itemOrRow;
    return `${item.requestNo}-${index}`;
  }

  async exportExcel(): Promise<void> {
    const search = this.listing.searchText().trim().toLowerCase();
    const stage = this.approvalStageFilter();
    const items = this.approvals().filter((item) => {
      const matchesSearch =
        !search ||
        item.requestNo.toLowerCase().includes(search) ||
        item.requestBy.name.toLowerCase().includes(search);
      const matchesStage =
        stage === 'all' ||
        (stage === 'director' && !!item.isPendingItDirectorApproval) ||
        (stage === 'approver' && !item.isPendingItDirectorApproval);
      return matchesSearch && matchesStage;
    });
    if (!items.length) return;

    this.loadingService.start('export');
    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      const border = {
        top: { style: 'thin', color: { rgb: 'D1D5DB' } },
        bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
        left: { style: 'thin', color: { rgb: 'D1D5DB' } },
        right: { style: 'thin', color: { rgb: 'D1D5DB' } },
      };
      const workbook = XLSX.utils.book_new();
      const statuses = ['Pending', 'Approved', 'Rejected', 'Referred Back'];

      for (const status of statuses) {
        const rows = items
          .filter((item) => item.status === status)
          .map((item) => ({
            'Request No.': item.requestNo,
            'Request Date': this.dateUtil.formatDateToBE(item.requestDate, 'DD/MM/YYYY HH:mm'),
            'Request By': item.requestBy.name,
            'Employee ID': item.requestBy.employeeId,
            Department: item.requestBy.department,
            'Request For': item.originalData?.requestFor || '-',
            'Request Category': item.originalData?.requestCategory || '-',
            Status: item.status,
            'Approval Stage': item.isPendingItDirectorApproval ? 'IT Director' : 'Approver',
          }));
        const headers = [
          'Request No.',
          'Request Date',
          'Request By',
          'Employee ID',
          'Department',
          'Request For',
          'Request Category',
          'Status',
          'Approval Stage',
        ];
        const worksheet = XLSX.utils.aoa_to_sheet([headers]);
        if (rows.length) {
          XLSX.utils.sheet_add_json(worksheet, rows, { origin: 'A2', skipHeader: true });
        }
        worksheet['!cols'] = [
          { wch: 20 },
          { wch: 22 },
          { wch: 28 },
          { wch: 16 },
          { wch: 24 },
          { wch: 28 },
          { wch: 30 },
          { wch: 18 },
          { wch: 18 },
        ];

        const range = XLSX.utils.decode_range(worksheet['!ref']!);
        for (let row = range.s.r; row <= range.e.r; row++) {
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })];
            if (!cell) continue;
            cell.s = { ...(cell.s ?? {}), border, alignment: { vertical: 'center' } };
          }
        }

        for (let col = range.s.c; col <= range.e.c; col++) {
          const header = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
          if (!header) continue;
          header.s = {
            ...(header.s ?? {}),
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { patternType: 'solid', fgColor: { rgb: '217346' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border,
          };
        }

        XLSX.utils.book_append_sheet(workbook, worksheet, status);
      }
      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
        cellStyles: true,
      });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const exportDate = new Date().toISOString().slice(0, 10);
      saveAs(blob, `it-approval-${exportDate}.xlsx`);
      this.toastService.success('Export Excel สำเร็จ');
    } catch (error) {
      this.errorService.handle(error, { component: 'ApprovalItRequest', action: 'export-excel' });
    } finally {
      this.loadingService.stop('export');
    }
  }
}
