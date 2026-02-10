import { Component, OnInit, signal, computed, inject } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaxiService, TaxiRequest, TaxiItem } from '../../services/taxi.service';
import { LoadingService } from '../../services/loading';
import { ToastService } from '../../services/toast';
import { DialogService } from '../../services/dialog';
import { ErrorService } from '../../services/error';
import { VehicleTaxiFormComponent } from '../../components/features/vehicle-taxi-form/vehicle-taxi-form';
import { FilePreviewModalComponent } from '../../components/modals/file-preview-modal/file-preview-modal';
import { StatusUtil } from '../../utils/status.util';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { createListingState, createListingComputeds, clearListingFilters, TableSortHelper } from '../../utils/listing.util';
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
  imports: [CommonModule, FormsModule, VehicleTaxiFormComponent, FilePreviewModalComponent, StatusLabelPipe, PaginationComponent, PageHeaderComponent, SkeletonComponent, EmptyStateComponent],
  templateUrl: './vehicle-taxi.html',
  styleUrl: './vehicle-taxi.scss',
})
export class VehicleTaxiComponent implements OnInit {
  private taxiService = inject(TaxiService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);
  private errorService = inject(ErrorService);

  isLoading = this.loadingService.loading('taxi-list');

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
      filtered = TableSortHelper.sortVehicleLikeData(filtered, id, desc, {
        id: 'requestId',
        desc: 'description',
        date: 'date',
        destination: 'destination'
      });
    }

    return filtered;
  });

  comps = createListingComputeds(this.processedData, this.listing);

  displayedRows = computed(() => {
    return this.comps.paginatedData().flatMap((request: TaxiRequest) =>
      request.items.map((item: TaxiItem, index: number) => ({
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
    manualPagination: true,
  }));

  setPageSize(size: number) {
    this.listing.pageSize.set(size);
    this.listing.currentPage.set(0);
  }

  goToPage(page: number) {
    this.listing.currentPage.set(page);
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loadingService.start('taxi-list');
    this.taxiService.getTaxiRequests().subscribe({
      next: (data) => {
        this.allRequests.set(data);
        this.loadingService.stop('taxi-list');
      },
      error: (error) => {
        this.loadingService.stop('taxi-list');
        this.errorService.handle(error, { component: 'VehicleTaxi', action: 'load-data' });
      }
    });
  }

  async deleteRequest(id: string) {
    const confirmed = await this.dialogService.confirm({
      title: 'ยืนยันการลบ',
      message: `ยืนยันการลบรายการเบิกเลขที่ ${id}?`,
      type: 'danger',
      confirmText: 'ลบรายการ'
    });

    if (confirmed) {
      this.taxiService.deleteTaxiRequest(id).subscribe({
        next: () => {
          this.toastService.success('ลบรายการเบิกเรียบร้อยแล้ว');
          this.loadData();
        },
        error: (error) => {
          this.errorService.handle(error, { component: 'VehicleTaxi', action: 'delete-request' });
        }
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
        this.toastService.warning('ไม่พบไฟล์แนบสำหรับรายการนี้');
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
    TableSortHelper.toggleSort(this.table, columnId);
  }

  getSortIcon(columnId: string) {
    return TableSortHelper.getSortIcon(this.table, columnId);
  }

  trackByRowId(index: number, itemOrRow: TaxiRequest | FlatTaxiRow | import('@tanstack/angular-table').Row<FlatTaxiRow>): string {
    const item = 'original' in itemOrRow ? itemOrRow.original : itemOrRow;
    const id = (item as FlatTaxiRow).requestId || (item as TaxiRequest).id || 'row';
    const date = (item as FlatTaxiRow).date || '';
    return `${id}-${date}-${index}`;
  }

  getStatusClass(status: string): string {
    return StatusUtil.getStatusBadgeClass(status);
  }
}
