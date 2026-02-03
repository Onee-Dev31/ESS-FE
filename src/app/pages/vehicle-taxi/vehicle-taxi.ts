import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaxiService, TaxiRequest, TaxiItem } from '../../services/taxi.service';
import { AlertService } from '../../services/alert.service';
import { VehicleTaxiFormComponent } from '../../components/features/vehicle-taxi-form/vehicle-taxi-form';
import { FilePreviewModalComponent } from '../../components/modals/file-preview-modal/file-preview-modal';
import { StatusUtil } from '../../utils/status.util';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { createListingState, clearListingFilters } from '../../utils/listing.util';
import { COMMON_STATUS_OPTIONS } from '../../constants/request-status.constant';
import {
  createAngularTable,
  getCoreRowModel,
  SortingState,
} from '@tanstack/angular-table';

interface FlatTaxiRow extends TaxiItem {
  requestId: string;
  createDate: string;
  status: string;
  isFirstInGroup: boolean;
  groupLength: number;
}

import { StatusLabelPipe } from '../../pipes/status-label.pipe';

@Component({
  selector: 'app-vehicle-taxi',
  standalone: true,
  imports: [CommonModule, FormsModule, VehicleTaxiFormComponent, FilePreviewModalComponent, StatusLabelPipe, PaginationComponent, PageHeaderComponent],
  templateUrl: './vehicle-taxi.html',
  styleUrl: './vehicle-taxi.scss',
})
export class VehicleTaxiComponent implements OnInit {
  private taxiService = inject(TaxiService);
  private alertService = inject(AlertService);
  private router = inject(Router);

  listing = createListingState();
  statusOptions = COMMON_STATUS_OPTIONS;

  isModalOpen = signal<boolean>(false);
  selectedRequestId = signal<string>('');
  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<any[]>([]);

  allRequests = signal<TaxiRequest[]>([]);
  sorting = signal<SortingState>([{ id: 'requestId', desc: true }]);

  processedData = computed(() => {
    let filtered = [...this.allRequests()];
    const status = this.listing.filterStatus();
    const start = this.listing.filterStartDate();
    const end = this.listing.filterEndDate();
    const search = this.listing.searchText().toLowerCase();

    if (status) filtered = filtered.filter(r => r.status === status);
    if (start) filtered = filtered.filter(r => r.createDate >= start);
    if (end) filtered = filtered.filter(r => r.createDate <= end);
    if (search) {
      filtered = filtered.filter(r =>
        r.id.toLowerCase().includes(search) ||
        r.items.some(item =>
          item.description.toLowerCase().includes(search) ||
          item.destination.toLowerCase().includes(search)
        )
      );
    }

    const sortState = this.sorting()[0];
    if (sortState) {
      const { id, desc } = sortState;
      const direction = desc ? -1 : 1;
      filtered.sort((a, b) => {
        if (id === 'requestId') return a.id.localeCompare(b.id) * direction;
        if (id === 'createDate') return a.createDate.localeCompare(b.createDate) * direction;
        return 0;
      });
    }

    return filtered;
  });

  paginatedRequests = computed(() => {
    const start = this.listing.currentPage() * this.listing.pageSize();
    return this.processedData().slice(start, start + this.listing.pageSize());
  });

  displayedRows = computed(() => {
    return this.paginatedRequests().flatMap(request =>
      request.items.map((item, index) => ({
        ...item,
        requestId: request.id,
        createDate: request.createDate,
        status: request.status,
        isFirstInGroup: index === 0,
        groupLength: request.items.length,
      } as FlatTaxiRow))
    );
  });

  table = createAngularTable(() => ({
    data: this.displayedRows(),
    columns: [
      { accessorKey: 'requestId', header: 'เลขที่การเบิก' },
      { accessorKey: 'createDate', header: 'วันที่สร้างรายการ' },
      { accessorKey: 'date', header: 'วันที่ขอเบิก' },
      { accessorKey: 'description', header: 'รายละเอียด' },
      { accessorKey: 'destination', header: 'สถานที่รับ-ส่ง' },
      { accessorKey: 'amount', header: 'จำนวนเงิน' },
      { accessorKey: 'status', header: 'สถานะ' },
    ],
    state: { sorting: this.sorting() },
    onSortingChange: (updaterOrValue) => {
      const next = typeof updaterOrValue === 'function' ? updaterOrValue(this.sorting()) : updaterOrValue;
      this.sorting.set(next);
    },
    getCoreRowModel: getCoreRowModel(),
  }));

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.taxiService.getTaxiRequests().subscribe(data => this.allRequests.set(data));
  }

  deleteRequest(id: string) {
    if (confirm('ยืนยันการลบรายการเบิกเลขที่ ' + id)) {
      this.taxiService.deleteTaxiRequest(id).subscribe(() => {
        this.alertService.showSuccess('ลบรายการเบิกเรียบร้อยแล้ว');
        this.loadData();
      });
    }
  }

  openModal(id: string = '') {
    if (!id) {
      this.taxiService.generateNextTaxiId().subscribe(nid => {
        this.selectedRequestId.set(nid);
        this.isModalOpen.set(true);
      });
    } else {
      this.selectedRequestId.set(id);
      this.isModalOpen.set(true);
    }
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.loadData();
  }

  openPreviewModalForRequest(requestId: string) {
    const request = this.allRequests().find(r => r.id === requestId);
    if (request?.items) {
      const files = request.items
        .filter(item => item.attachedFile)
        .map(item => ({ fileName: item.attachedFile, date: item.date }));

      if (files.length > 0) {
        this.previewFiles.set(files);
        this.isPreviewModalOpen.set(true);
      } else {
        this.alertService.showWarning('ไม่พบไฟล์แนบสำหรับรายการนี้', 'ไม่พบไฟล์');
      }
    }
  }

  closePreviewModal() {
    this.isPreviewModalOpen.set(false);
    this.previewFiles.set([]);
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

  trackByRowId(index: number, row: any): string {
    const original = row.original || row;
    return `${original.requestId}-${original.date}-${index}`;
  }

  getStatusClass(status: string): string {
    return StatusUtil.getStatusBadgeClass(status);
  }
}
