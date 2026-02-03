import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimeOffService, TimeOffRequest } from '../../services/time-off.service';
import { LoadingService } from '../../services/loading.service';
import { TimeOffForm } from '../../components/features/time-off-form/time-off-form';
import { FilePreviewModalComponent } from '../../components/modals/file-preview-modal/file-preview-modal';
import { DateUtilityService } from '../../services/date-utility.service';

import { StatusLabelPipe } from '../../pipes/status-label.pipe';
import { StatusUtil } from '../../utils/status.util';
import { REQUEST_STATUS, COMMON_STATUS_OPTIONS } from '../../constants/request-status.constant';
import { createListingState, createListingComputeds, clearListingFilters } from '../../utils/listing.util';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';

@Component({
  selector: 'app-timeoff',
  standalone: true,
  imports: [CommonModule, FormsModule, TimeOffForm, FilePreviewModalComponent, StatusLabelPipe, PaginationComponent, PageHeaderComponent],
  templateUrl: './timeoff.html',
  styleUrl: './timeoff.scss',
})
export class TimeoffComponent implements OnInit {
  protected loadingService = inject(LoadingService);
  private timeoffService = inject(TimeOffService);
  private router = inject(Router);
  private dateUtil = inject(DateUtilityService);

  requests = signal<TimeOffRequest[]>([]);
  isFormOpen = signal<boolean>(false);
  selectedRequestStatus = signal<string>('คำขอใหม่');

  // ใช้ Utility จัดการ State (DRY Pagination & Filters)
  listing = createListingState();

  // ใช้ Utility จัดการ Computed values (DRY filtering & pagination logic)
  comps = createListingComputeds(this.requests, this.listing, (req, search, status, start, end) => {
    const matchSearch = !search ||
      req.id.toLowerCase().includes(search) ||
      req.reason.toLowerCase().includes(search) ||
      req.leaveType.toLowerCase().includes(search);

    const matchStatus = !status || req.status === status;
    const matchStart = !start || req.createDate >= start;
    const matchEnd = !end || req.createDate <= end;

    return matchSearch && matchStatus && matchStart && matchEnd;
  });

  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<any[]>([]);

  protected readonly Math = Math;
  statuses = COMMON_STATUS_OPTIONS;

  ngOnInit() {
    this.loadRequests();
  }

  loadRequests() {
    this.timeoffService.getRequests().subscribe((data: TimeOffRequest[]) => {
      this.requests.set(data);
    });
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

  goBack() {
    this.router.navigate(['/dashboard']);
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
