import { Component, OnInit, signal, inject, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimeOffService, TimeOffRequest } from '../../services/time-off.service';
import { LoadingService } from '../../services/loading';
import { ToastService } from '../../services/toast';
import { DialogService } from '../../services/dialog';
import { ErrorService } from '../../services/error';
import { TimeOffForm } from '../../components/features/time-off-form/time-off-form';
import { FilePreviewModalComponent } from '../../components/modals/file-preview-modal/file-preview-modal';
import { DateUtilityService } from '../../services/date-utility.service';
import { AuthService } from '../../services/auth.service';

import { COMMON_STATUS_OPTIONS } from '../../constants/request-status.constant';
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

type StatusDisplayMeta =
  | { label: string; className: string }
  | { labelTH: string; labelEN: string; className: string };

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
  protected readonly dateUtil = inject(DateUtilityService);

  isLoading = this.loadingService.loading('timeoff-list');

  requests = signal<TimeOffRequest[]>([]);
  isFormOpen = signal<boolean>(false);
  selectedRequestStatus = signal<string>('คำขอใหม่');
  selectedRequest = signal<TimeOffRequest | null>(null);

  listing = createListingState();

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

        const matchStatus = !status || req.status === status;
        const matchStart = !start || req.createDate >= start;
        const matchEnd = !end || req.createDate <= end;

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
  previewFiles = signal<{ fileName: string; date: string }[]>([]);

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
      labelTH: 'ยกเลอกคำขอ',
      labelEN: 'Cancelled',
      className: 'status-cancelled',
    },
  };

  ngOnInit() {
    this.loadRequests();
  }

  /** โหลดข้อมูลรายการคำขอลาผ่าน Service */
  loadRequests() {
    const employeeCode = this.authService.userData()?.CODEMPID?.trim() ?? '';
    const currentYear = new Date().getFullYear();

    if (!employeeCode) {
      this.requests.set([]);
      this.errorService.handle(new Error('ไม่พบรหัสพนักงานของผู้ใช้งาน'), {
        component: 'TimeOff',
        action: 'load-requests',
      });
      return;
    }

    this.loadingService.start('timeoff-list');
    this.timeoffService.getLeaveRequests(currentYear, currentYear, employeeCode).subscribe({
      next: (data: TimeOffRequest[]) => {
        this.requests.set(data);
        this.loadingService.stop('timeoff-list');
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
    this.timeoffService
      .saveLeaveRequest({
        action: 'Cancel',
        request_id: (request.request_id ?? Number(request.id)) || 0,
        employee_code: request.employee_code || request.employeeId,
        leave_type_id: request.leave_type_id ?? 0,
        start_date: request.startDate,
        end_date: request.endDate,
        total_days: request.days ?? 0,
        year: new Date(request.startDate).getFullYear(),
        reason: request.reason,
        is_half_day: request.leavePeriod === 'morning' || request.leavePeriod === 'afternoon',
        half_day_period: request.leavePeriod ?? '',
        delete_file_ids: 0,
      })
      .subscribe({
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

  openPreview(attachments: { name: string }[]) {
    if (!attachments || attachments.length === 0) return;
    const previewItems = attachments.map((att) => ({
      fileName: att.name || 'Attachment',
      date: '',
    }));
    this.previewFiles.set(previewItems);
    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }

  clearFilters() {
    clearListingFilters(this.listing);
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
    return value.toUpperCase().replace(/[\s-]+/g, '_');
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

  getLeaveTypeIcon(leaveType: string): string {
    const iconMap: { [key: string]: string } = {
      ลาพักร้อน: 'fas fa-plane-departure',
      ลากิจ: 'fas fa-briefcase',
      ลาป่วย: 'fas fa-stethoscope',
      ลาทำหมัน: 'fas fa-user-md',
      ลาเพื่อจัดการงานศพ: 'fas fa-ribbon',
    };
    return iconMap[leaveType] || 'fas fa-calendar';
  }

  getPeriodLabel(period: string | undefined): string {
    if (!period) return '';
    const periodMap: { [key: string]: string } = {
      'full-day': 'เต็มวัน',
      morning: 'ครึ่งวันเช้า',
      afternoon: 'ครึ่งวันบ่าย',
    };
    return periodMap[period] || period;
  }

  formatDate(dateStr: string): string {
    return this.dateUtil.formatDateToThaiMonth(dateStr);
  }
}
