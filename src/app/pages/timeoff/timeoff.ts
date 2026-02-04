/**
 * @file Timeoff
 * @description Logic for Timeoff
 */

// Section: Imports
import { Component, OnInit, signal, inject, computed } from '@angular/core';
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

import { StatusLabelPipe } from '../../pipes/status-label.pipe';
import { StatusUtil } from '../../utils/status.util';
import { REQUEST_STATUS, COMMON_STATUS_OPTIONS } from '../../constants/request-status.constant';
import { createListingState, createListingComputeds, clearListingFilters } from '../../utils/listing.util';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import {
  createAngularTable,
  getCoreRowModel,
  SortingState,
} from '@tanstack/angular-table';

// Section: Logic
@Component({
  selector: 'app-timeoff',
  standalone: true,
  imports: [CommonModule, FormsModule, TimeOffForm, FilePreviewModalComponent, StatusLabelPipe, PaginationComponent, SkeletonComponent, EmptyStateComponent, PageHeaderComponent],
  templateUrl: './timeoff.html',
  styleUrl: './timeoff.scss',
})
export class TimeoffComponent implements OnInit {
  protected loadingService = inject(LoadingService);
  private timeoffService = inject(TimeOffService);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);
  private errorService = inject(ErrorService);
  private dateUtil = inject(DateUtilityService);

  isLoading = this.loadingService.loading('timeoff-list');

  requests = signal<TimeOffRequest[]>([]);
  isFormOpen = signal<boolean>(false);
  selectedRequestStatus = signal<string>('คำขอใหม่');

  listing = createListingState();

  sorting = signal<SortingState>([{ id: 'createDate', desc: true }]);

  processedData = computed(() => {
    let filtered = [...this.requests()];

    const search = this.listing.searchText().toLowerCase();
    const status = this.listing.filterStatus();
    const start = this.listing.filterStartDate();
    const end = this.listing.filterEndDate();

    if (search || status || start || end) {
      filtered = filtered.filter(req => {
        const matchSearch = !search ||
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
        let valA: any = a[key];
        let valB: any = b[key];

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
      { accessorKey: 'id', header: 'รหัสคำขอ' },
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
      const next = typeof updaterOrValue === 'function' ? updaterOrValue(this.sorting()) : updaterOrValue;
      this.sorting.set(next);
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  }));

  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<any[]>([]);

  protected readonly Math = Math;
  statuses = COMMON_STATUS_OPTIONS;

  ngOnInit() {
    this.loadRequests();
  }

  loadRequests() {
    this.loadingService.start('timeoff-list');
    this.timeoffService.getRequests().subscribe({
      next: (data: TimeOffRequest[]) => {
        this.requests.set(data);
        this.loadingService.stop('timeoff-list');
      },
      error: (error) => {
        this.loadingService.stop('timeoff-list');
        this.errorService.handle(error, { component: 'TimeOff', action: 'load-requests' });
      }
    });
  }

  async deleteRequest(request: TimeOffRequest) {
    const confirmed = await this.dialogService.confirm({
      title: 'ยืนยันการลบ',
      message: `คุณต้องการลบรายการลา "${request.leaveType}" รหัส ${request.id} หรอไม่?`,
      type: 'danger',
      confirmText: 'ลบรายการ'
    });

    if (confirmed) {






      this.requests.set(this.requests().filter(r => r.id !== request.id));
      this.toastService.success('ลบรายการสำเร็จ');
    }
  }

  setPageSize(size: number) {
    this.listing.pageSize.set(size);
    this.listing.currentPage.set(0);
  }

  goToPage(page: number) {
    this.listing.currentPage.set(page);
  }

  openForm(status: string = 'NEW') {
    this.selectedRequestStatus.set(status);
    this.isFormOpen.set(true);
  }

  closeForm() {
    this.isFormOpen.set(false);
    this.loadRequests();
  }

  openPreview(attachments: any[]) {
    if (!attachments || attachments.length === 0) return;
    const previewItems = attachments.map(att => ({
      fileName: att.name || 'Attachment',
      date: ''
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
    const column = this.table.getColumn(columnId);
    if (column) column.toggleSorting(column.getIsSorted() === 'asc');
  }

  getSortIcon(columnId: string) {
    const isSorted = this.table.getColumn(columnId)?.getIsSorted();
    return {
      'fa-sort-amount-up': isSorted === 'asc',
      'fa-sort-amount-down-alt': isSorted === 'desc',
      'fa-sort': !isSorted,
      'text-muted': !isSorted,
    };
  }

  getStatusClass(status: string): string {
    return StatusUtil.getStatusBadgeClass(status);
  }

  getLeaveTypeIcon(leaveType: string): string {
    const iconMap: { [key: string]: string } = {
      'ลาพักร้อน': 'fas fa-plane-departure',
      'ลากิจ': 'fas fa-briefcase',
      'ลาป่วย': 'fas fa-stethoscope',
      'ลาทำหมัน': 'fas fa-user-md',
      'ลาเพื่อจัดการงานศพ': 'fas fa-ribbon'
    };
    return iconMap[leaveType] || 'fas fa-calendar';
  }

  getPeriodLabel(period: string | undefined): string {
    if (!period) return '';
    const periodMap: { [key: string]: string } = {
      'full-day': 'เต็มวัน',
      'morning': 'ครึ่งวันเช้า',
      'afternoon': 'ครึ่งวันบ่าย'
    };
    return periodMap[period] || period;
  }

  formatDate(dateStr: string): string {
    return this.dateUtil.formatDateToThaiMonth(dateStr);
  }
}
