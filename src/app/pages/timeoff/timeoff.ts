import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimeOffService, TimeOffRequest } from '../../services/time-off.service';
import { TimeOffForm } from '../../components/features/time-off-form/time-off-form';
import { FilePreviewModalComponent } from '../../components/modals/file-preview-modal/file-preview-modal';
import { DateUtilityService } from '../../services/date-utility.service';

import { StatusLabelPipe } from '../../pipes/status-label.pipe';

@Component({
  selector: 'app-timeoff',
  standalone: true,
  imports: [CommonModule, FormsModule, TimeOffForm, FilePreviewModalComponent, StatusLabelPipe],
  templateUrl: './timeoff.html',
  styleUrl: './timeoff.scss',
})
export class TimeoffComponent implements OnInit {
  private timeoffService = inject(TimeOffService);
  private router = inject(Router);
  private dateUtil = inject(DateUtilityService);

  requests = signal<TimeOffRequest[]>([]);
  filteredRequests = signal<TimeOffRequest[]>([]);
  isFormOpen = signal<boolean>(false);
  selectedRequestStatus = signal<string>('คำขอใหม่');

  // New Standardized Filters
  filterStatus = signal<string>('');
  filterStartDate = signal<string>('');
  filterEndDate = signal<string>('');
  searchText = signal<string>('');

  // Pagination
  pageSize = signal<number>(10);
  currentPage = signal<number>(0);

  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<any[]>([]);

  protected readonly Math = Math;

  statuses = [
    { value: 'NEW', label: 'คำขอใหม่' },
    { value: 'VERIFIED', label: 'ตรวจสอบแล้ว' },
    { value: 'PENDING_APPROVAL', label: 'อยู่ระหว่างการอนุมัติ' },
    { value: 'APPROVED', label: 'อนุมัติแล้ว' }
  ];

  totalRequests = computed(() => this.filteredRequests().length);
  totalPages = computed(() => Math.ceil(this.totalRequests() / this.pageSize()));

  paginatedRequests = computed(() => {
    const start = this.currentPage() * this.pageSize();
    const end = start + this.pageSize();
    return this.filteredRequests().slice(start, end);
  });

  canPreviousPage = computed(() => this.currentPage() > 0);
  canNextPage = computed(() => this.currentPage() < this.totalPages() - 1);

  ngOnInit() {
    this.loadRequests();
  }

  loadRequests() {
    this.timeoffService.getRequests().subscribe((data: TimeOffRequest[]) => {
      this.requests.set(data);
      this.applyFilters();
    });
  }

  applyFilters() {
    let filtered = [...this.requests()];

    // Filter by search text
    if (this.searchText()) {
      const search = this.searchText().toLowerCase();
      filtered = filtered.filter(req =>
        req.id.toLowerCase().includes(search) ||
        req.reason.toLowerCase().includes(search) ||
        req.leaveType.toLowerCase().includes(search)
      );
    }

    // Filter by status
    if (this.filterStatus()) {
      filtered = filtered.filter(req => req.status === this.filterStatus());
    }

    // Filter by date range
    if (this.filterStartDate()) {
      filtered = filtered.filter(req => req.createDate >= this.filterStartDate());
    }
    if (this.filterEndDate()) {
      filtered = filtered.filter(req => req.createDate <= this.filterEndDate());
    }

    this.filteredRequests.set(filtered);
    this.currentPage.set(0); // Reset to first page on filter change
  }

  // Pagination Methods
  setPageSize(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(0);
  }

  goToPage(page: number) {
    this.currentPage.set(page);
  }

  previousPage() {
    if (this.canPreviousPage()) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage() {
    if (this.canNextPage()) {
      this.currentPage.update(p => p + 1);
    }
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
    this.filterStatus.set('');
    this.filterStartDate.set('');
    this.filterEndDate.set('');
    this.searchText.set('');
    this.currentPage.set(0);
    this.applyFilters();
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'NEW': 'status-new',
      'WAITING_CHECK': 'status-new',
      'VERIFIED': 'status-reviewed',
      'PENDING_APPROVAL': 'status-pending',
      'APPROVED': 'status-approved',
      'REJECTED': 'status-rejected',
      'REFERRED_BACK': 'status-rejected',
      // Legacy support just in case
      'คำขอใหม่': 'status-new',
      'ตรวจสอบแล้ว': 'status-reviewed',
      'อยู่ระหว่างการอนุมัติ': 'status-pending',
      'อนุมัติแล้ว': 'status-approved',
      'ไม่อนุมัติ': 'status-rejected'
    };
    return statusMap[status] || '';
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
