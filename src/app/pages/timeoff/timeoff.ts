import {
  Component,
  OnInit,
  signal,
  inject,
  computed,
  ChangeDetectorRef,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  TimeOffService,
  TimeOffRequest,
  SaveLeaveRequestPayload,
} from '../../services/time-off.service';
import { LoadingService } from '../../services/loading';
import { ToastService } from '../../services/toast';
import { DialogService } from '../../services/dialog';
import { ErrorService } from '../../services/error';
import { TimeOffForm } from '../../components/features/time-off-form/time-off-form';
import {
  FilePreviewItem,
  FilePreviewModalComponent,
} from '../../components/modals/file-preview-modal/file-preview-modal';
import { DateUtilityService } from '../../services/date-utility.service';
import { AuthService } from '../../services/auth.service';
import { FileConverterService } from '../../services/file-converter';

import {
  createListingState,
  createListingComputeds,
  clearListingFilters,
  TableSortHelper,
} from '../../utils/listing.util';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { PageLoaderComponent } from '../../components/shared/page-loader/page-loader';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { createAngularTable, getCoreRowModel, SortingState } from '@tanstack/angular-table';
import { NzSelectModule } from 'ng-zorro-antd/select';

type StatusDisplayMeta =
  { label: string; className: string } | { labelTH: string; labelEN: string; className: string };

/** หน้าแสดงรายการคำขอลา (Time Off Request List) พร้อมระบบกรองและค้นหา */
@Component({
  selector: 'app-timeoff',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TimeOffForm,
    FilePreviewModalComponent,
    PaginationComponent,
    PageLoaderComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    NzSelectModule,
  ],
  templateUrl: './timeoff.html',
  styleUrl: './timeoff.scss',
})
export class TimeoffComponent implements OnInit {
  protected loadingService = inject(LoadingService);
  private timeoffService = inject(TimeOffService);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);
  private errorService = inject(ErrorService);
  private authService = inject(AuthService);
  private fileConverter = inject(FileConverterService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  protected readonly dateUtil = inject(DateUtilityService);

  isLoading = this.loadingService.loading('timeoff-list');

  requests = signal<TimeOffRequest[]>([]);
  isFormOpen = signal<boolean>(false);
  selectedRequestStatus = signal<string>('คำขอใหม่');
  selectedRequest = signal<TimeOffRequest | null>(null);

  listing = createListingState();
  readonly currentFilterYear = new Date().getFullYear();
  readonly filterYears = Array.from({ length: 6 }, (_, index) => this.currentFilterYear - index);
  readonly draftYearFrom = signal<string>('');
  readonly draftYearTo = signal<string>('');
  readonly draftStatus = signal<string>('');
  readonly draftSearchText = signal<string>('');
  readonly statuses = [
    { value: 'NEW', label: 'คำขอใหม่' },
    { value: 'PENDING', label: 'อยู่ระหว่างการอนุมัติ' },
    { value: 'APPROVED', label: 'อนุมัติแล้ว' },
    { value: 'REJECTED', label: 'ถูกปฏิเสธ' },
    { value: 'SENDBACK', label: 'ถูกส่งกลับ' },
    { value: 'CANCELLED', label: 'ยกเลิกคำขอ' },
  ];

  sorting = signal<SortingState>([{ id: 'createDate', desc: true }]);

  /** ประมวลผลข้อมูลรายการลา (Filtering และ Sorting) */
  processedData = computed(() => {
    let filtered = [...this.requests()];

    const search = this.listing.searchText().toLowerCase();
    const status = this.listing.filterStatus();
    const start = this.listing.filterStartDate();
    const end = this.listing.filterEndDate();

    if (search || status || start || end) {
      filtered = filtered.filter((req) => {
        const matchSearch =
          !search ||
          req.id.toLowerCase().includes(search) ||
          req.reason.toLowerCase().includes(search) ||
          req.leaveType.toLowerCase().includes(search);

        const matchStatus =
          !status || this.normalizeStatusKey(req.status) === this.normalizeStatusKey(status);
        const createdYear = this.toDateKey(this.getCreatedAt(req)).slice(0, 4);
        const matchStart = !start || (!!createdYear && Number(createdYear) >= Number(start));
        const matchEnd = !end || (!!createdYear && Number(createdYear) <= Number(end));

        return matchSearch && matchStatus && matchStart && matchEnd;
      });
    }

    const sortState = this.sorting()[0];
    if (sortState) {
      const { id, desc } = sortState;
      const direction = desc ? -1 : 1;

      filtered.sort((a, b) => {
        const key = id as keyof TimeOffRequest;
        let valA: string | number = a[key] as string | number;
        let valB: string | number = b[key] as string | number;

        if (id === 'days') {
          valA = Number(a.days || 0);
          valB = Number(b.days || 0);
        } else if (id === 'startDate' || id === 'endDate' || id === 'createDate') {
          const sA = (valA as string) || '';
          const sB = (valB as string) || '';
          return sA.localeCompare(sB) * direction;
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          return valA.localeCompare(valB) * direction;
        }

        if (valA < valB) return -1 * direction;
        if (valA > valB) return 1 * direction;
        return 0;
      });
    }

    return filtered;
  });

  comps = createListingComputeds(this.processedData, this.listing);

  table = createAngularTable(() => ({
    data: this.comps.paginatedData(),
    columns: [
      { accessorKey: 'createDate', header: 'วันที่ทำรายการ / เลขที่ใบลา' },
      { accessorKey: 'startDate', header: 'วันที่เริ่มลา' },
      { accessorKey: 'endDate', header: 'วันที่สิ้นสุดลา' },
      { accessorKey: 'days', header: 'จำนวนวัน' },
      { accessorKey: 'leaveType', header: 'ประเภทการลา' },
      { accessorKey: 'leavePeriod', header: 'ประเภทวันลา' },
      { accessorKey: 'reason', header: 'เหตุผล' },
      { accessorKey: 'status', header: 'สถานะ' },
    ],
    state: { sorting: this.sorting() },
    onSortingChange: (updaterOrValue) => {
      const next =
        typeof updaterOrValue === 'function' ? updaterOrValue(this.sorting()) : updaterOrValue;
      this.sorting.set(next);
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  }));

  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  highlightedRequestId = signal<number | null>(null);
  private pendingFocusRequestId = signal<number | null>(null);

  // statuses = COMMON_STATUS_OPTIONS;
  private readonly statusDisplay: Record<string, StatusDisplayMeta> = {
    NEW: { labelTH: 'คำขอใหม่', labelEN: 'New', className: 'status-new' },
    PENDING: {
      labelTH: 'อยู่ระหว่างการอนุมัติ',
      labelEN: 'Pending',
      className: 'status-pending',
    },
    APPROVED: { labelTH: 'อนุมัติแล้ว', labelEN: 'Approved', className: 'status-approved' },
    REJECTED: { labelTH: 'ถูกปฏิเสธ', labelEN: 'Rejected', className: 'status-rejected' },
    SENDBACK: {
      labelTH: 'ถูกส่งกลับ',
      labelEN: 'Sendback',
      className: 'status-referred',
    },
    CANCELLED: {
      labelTH: 'ยกเลิกคำขอ',
      labelEN: 'Cancelled',
      className: 'status-cancelled',
    },
  };

  ngOnInit() {
    const currentYear = String(this.currentFilterYear);
    this.draftYearFrom.set(currentYear);
    this.draftYearTo.set(currentYear);
    this.listing.filterStartDate.set(currentYear);
    this.listing.filterEndDate.set(currentYear);

    // เมื่อกด noti ซ้ำขณะอยู่ในหน้านี้อยู่แล้ว (route เดิม แค่ query param เปลี่ยน) ต้อง refresh
    // ข้อมูลใหม่ด้วย ไม่ใช่แค่ focus รายการ — ข้าม emission แรกเพราะ loadRequests() ท้ายนี้จัดการอยู่แล้ว
    let isFirstEmit = true;
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const requestId = Number(params['requestId']);
      if (requestId) this.pendingFocusRequestId.set(requestId);
      if (!isFirstEmit) this.loadRequests();
      isFirstEmit = false;
    });

    this.loadRequests();
  }

  private applyPendingFocus(): void {
    const targetId = this.pendingFocusRequestId();
    if (targetId == null) return;
    this.pendingFocusRequestId.set(null);

    const index = this.comps.filteredData().findIndex((item) => item.request_id === targetId);
    if (index === -1) return;

    this.listing.currentPage.set(Math.floor(index / this.listing.pageSize()));

    this.highlightedRequestId.set(targetId);
    setTimeout(() => this.highlightedRequestId.set(null), 8000);

    const scrollToRequest = (retries = 10) => {
      // ตาราง desktop กับการ์ด mobile คนละ element กัน ขึ้นอยู่กับขนาดจอ (CSS media query)
      // ต้องเลือก element ที่ visible จริง ไม่ใช่แค่ element แรกที่เจอ
      const candidates = [
        document.getElementById('timeoff-request-' + targetId),
        document.getElementById('timeoff-request-mobile-' + targetId),
      ];
      const el = candidates.find((c) => c && c.offsetParent !== null);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (retries > 0) {
        setTimeout(() => scrollToRequest(retries - 1), 300);
      }
    };
    setTimeout(() => scrollToRequest(), 0);
  }

  /** โหลดข้อมูลรายการคำขอลาผ่าน Service */
  loadRequests() {
    const employeeCode = this.authService.userData()?.CODEMPID?.trim() ?? '';
    const currentYear = new Date().getFullYear();
    const yearFrom = Number(this.listing.filterStartDate()) || currentYear;
    const yearTo = Number(this.listing.filterEndDate()) || yearFrom;

    if (!employeeCode) {
      this.requests.set([]);
      this.errorService.handle(new Error('ไม่พบรหัสพนักงานของผู้ใช้งาน'), {
        component: 'TimeOff',
        action: 'load-requests',
      });
      return;
    }

    this.loadingService.start('timeoff-list');
    console.log('[getLeaveRequests] Response', { yearFrom, yearTo, employeeCode });
    this.timeoffService.getLeaveRequests(yearFrom, yearTo, employeeCode).subscribe({
      next: (data: TimeOffRequest[]) => {
        console.log('[getLeaveRequests] Response', data);
        this.requests.set(data);
        this.loadingService.stop('timeoff-list');
        this.applyPendingFocus();
      },
      error: (error) => {
        this.loadingService.stop('timeoff-list');
        this.errorService.handle(error, { component: 'TimeOff', action: 'load-requests' });
      },
    });
  }

  /** ขอลบรายการลา (แสดง Dialog ยืนยันก่อนลบ) */
  async deleteRequest(request: TimeOffRequest) {
    const confirmed = await this.dialogService.confirm({
      title: 'ยืนยันการลบ',
      message: `คุณต้องการลบรายการลา "${request.leaveType}" รหัส ${request.id} หรอไม่?`,
      type: 'danger',
      confirmText: 'ลบรายการ',
    });

    if (!confirmed) return;

    this.loadingService.start('timeoff-list');
    const payload: SaveLeaveRequestPayload = {
      action: 'Cancel' as const,
      request_id: (request.request_id ?? Number(request.id)) || 0,
      request_by: request.employee_code || request.employeeId,
    };
    this.timeoffService.saveLeaveRequest(payload).subscribe({
      next: () => {
        this.toastService.success('ลบรายการสำเร็จ');
        this.loadRequests();
      },
      error: (error) => {
        this.loadingService.stop('timeoff-list');
        this.errorService.handle(error, { component: 'TimeOff', action: 'cancel-request' });
      },
    });
  }

  setPageSize(size: number) {
    this.listing.pageSize.set(size);
    this.listing.currentPage.set(0);
  }

  goToPage(page: number) {
    this.listing.currentPage.set(page);
  }

  /** เปิดฟอร์มสำหรับยื่นคำขอลาใหม่ */
  openForm(request?: TimeOffRequest) {
    this.selectedRequest.set(request ?? null);
    this.selectedRequestStatus.set(request?.status ?? 'NEW');
    this.isFormOpen.set(true);
  }

  closeForm() {
    this.isFormOpen.set(false);
    this.selectedRequest.set(null);
    this.loadRequests();
  }

  openPreview(attachments: TimeOffRequest['attachments']): void {
    if (!attachments?.length) return;
    this.previewFiles.set(this.fileConverter.buildPreviewFiles(attachments));
    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }

  clearFilters() {
    clearListingFilters(this.listing);
    const currentYear = String(this.currentFilterYear);
    this.draftYearFrom.set(currentYear);
    this.draftYearTo.set(currentYear);
    this.draftStatus.set('');
    this.draftSearchText.set('');
    this.listing.filterStartDate.set(currentYear);
    this.listing.filterEndDate.set(currentYear);
    this.loadRequests();
  }

  onCreatedDateFilterChange(type: 'start' | 'end', value: string | number | null): void {
    const year = value == null ? '' : String(value).replace(/\D/g, '').slice(0, 4);
    if (type === 'start') {
      this.draftYearFrom.set(year);
    } else {
      this.draftYearTo.set(year);
    }
  }

  onStatusFilterChange(status: string | null): void {
    this.draftStatus.set(status ?? '');
  }

  searchRequests(): void {
    const currentYear = new Date().getFullYear();
    const yearFrom = Number(this.draftYearFrom()) || currentYear;
    const yearTo = Number(this.draftYearTo()) || yearFrom;

    if (yearFrom > yearTo) {
      this.toastService.warning('ปีเริ่มต้นต้องไม่มากกว่าปีสิ้นสุด');
      return;
    }

    this.listing.filterStartDate.set(String(yearFrom));
    this.listing.filterEndDate.set(String(yearTo));
    this.listing.filterStatus.set(this.draftStatus());
    this.listing.searchText.set(this.draftSearchText().trim());
    this.listing.currentPage.set(0);
    this.loadRequests();
  }

  private toDateKey(value: string): string {
    const match = value?.match(/^(\d{4}-\d{2}-\d{2})/);
    return match?.[1] ?? '';
  }

  toggleSort(columnId: string) {
    TableSortHelper.toggleSort(this.table, columnId);
  }

  getSortIcon(columnId: string) {
    return TableSortHelper.getSortIcon(this.table, columnId);
  }

  getStatusMeta(status: string): { label: string; className: string } {
    const key = this.normalizeStatusKey(status);
    const meta = this.statusDisplay[key];

    if (!meta) {
      return {
        label: key || 'ไม่ระบุสถานะ',
        className: 'status-neutral',
      };
    }

    return {
      label: 'label' in meta ? meta.label : meta.labelTH,
      className: meta.className,
    };
  }

  isEditableRequest(status: string): boolean {
    return ['NEW', 'SENDBACK', 'SEND_BACK', 'REFERRED_BACK'].includes(
      this.normalizeStatusKey(status),
    );
  }

  private normalizeStatusKey(status: string): string {
    const value = status?.trim() ?? '';
    if (value === 'คำขอใหม่') return 'NEW';
    const key = value.toUpperCase().replace(/[\s-]+/g, '_');
    const aliases: Record<string, string> = {
      PENDING_APPROVAL: 'PENDING',
      PENDING_ACTION: 'PENDING',
      SEND_BACK: 'SENDBACK',
      REFERRED_BACK: 'SENDBACK',
      CANCELED: 'CANCELLED',
    };
    return aliases[key] ?? key;
  }

  getCreatedAt(request: TimeOffRequest): string {
    return request.create_at || request.createDate;
  }

  getLeaveNumber(request: TimeOffRequest): string {
    return request.leave_number || request.id;
  }

  formatCreatedAt(dateStr: string): string {
    if (!dateStr) return '-';
    return this.dateUtil.formatDateToBE(dateStr, 'DD/MM/YYYY');
  }

  isSameLeaveDate(request: TimeOffRequest): boolean {
    return request.startDate === request.endDate;
  }

  getPeriodLabel(period: string | undefined): string {
    if (!period) return '';
    const periodMap: Record<string, string> = {
      FULL: 'เต็มวัน',
      '1ST': 'ครึ่งวันเช้า',
      '2ND': 'ครึ่งวันบ่าย',
    };
    const key = period.trim().toUpperCase().replace(/\s+/g, '_');
    return periodMap[key] ?? period;
  }

  formatDate(dateStr: string): string {
    return this.dateUtil.formatDateToThaiMonth(dateStr);
  }
}
