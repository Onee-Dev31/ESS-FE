import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransportService, VehicleRequest } from '../../services/transport.service';
import { LoadingService } from '../../services/loading';
import { ToastService } from '../../services/toast';
import { DialogService } from '../../services/dialog';
import { VehicleFormComponent } from '../../components/features/vehicle-form/vehicle-form';
import { StatusUtil } from '../../utils/status.util';
import { createListingState, createListingComputeds, clearListingFilters, TableSortHelper } from '../../utils/listing.util';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import {
  createAngularTable,
  getCoreRowModel,
  SortingState,
} from '@tanstack/angular-table';

import { StatusLabelPipe } from '../../pipes/status-label.pipe';

/** หน้าแสดงรายการคำขอเบี้ยเลี้ยงค่ารถ (Vehicle Allowance) */
@Component({
  selector: 'app-vehicle',
  standalone: true,
  imports: [CommonModule, FormsModule, VehicleFormComponent, StatusLabelPipe, PaginationComponent, PageHeaderComponent, EmptyStateComponent, SkeletonComponent],
  templateUrl: './vehicle.html',
  styleUrl: './vehicle.scss',
})
export class VehicleComponent implements OnInit {
  private transportService = inject(TransportService);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);

  isModalOpen = false;
  selectedRequestId = '';

  allRequests = signal<VehicleRequest[]>([]);
  sorting = signal<SortingState>([{ id: 'id', desc: true }]);

  listing = createListingState();

  processedData = computed(() => {
    const list = [...this.allRequests()];

    const search = this.listing.searchText().toLowerCase();
    const status = this.listing.filterStatus();
    const start = this.listing.filterStartDate();
    const end = this.listing.filterEndDate();

    let filtered = list.filter(r => {
      const matchSearch = !search || r.id.toLowerCase().includes(search);
      const matchStatus = !status || r.status === status;
      const matchStart = !start || r.createDate >= start;
      const matchEnd = !end || r.createDate <= end;
      return matchSearch && matchStatus && matchStart && matchEnd;
    });

    const sortState = this.sorting()[0];
    if (sortState) {
      const { id, desc } = sortState;
      filtered = TableSortHelper.sortVehicleLikeData(filtered, id, desc, {
        desc: 'desc',
        date: 'date'
      });
    }
    return filtered;
  });

  comps = createListingComputeds(this.processedData, this.listing);

  table = createAngularTable(() => ({
    data: this.comps.paginatedData(),
    columns: [
      { accessorKey: 'id', header: 'เลขที่การเบิก' },
      { accessorKey: 'createDate', header: 'วันที่สร้างรายการ' },
      { accessorKey: 'date', header: 'วันที่ขอเบิก' },
      { accessorKey: 'desc', header: 'รายละเอียด' },
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

  ngOnInit() {
    this.loadData();
  }

  private loadingService = inject(LoadingService);
  isLoading = this.loadingService.loading('vehicle-list');

  loadData() {
    this.loadingService.start('vehicle-list');
    this.transportService.getRequests().subscribe({
      next: (data) => {
        this.allRequests.set(data);
        this.loadingService.stop('vehicle-list');
      },
      error: (error) => {
        this.loadingService.stop('vehicle-list');

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
      this.transportService.deleteRequest(id).subscribe(() => {
        this.toastService.success('ลบรายการเรียบร้อยแล้ว');
        this.loadData();
      });
    }
  }

  openModal(id: string = '') {
    if (id === '') {
      this.transportService.generateNextId().subscribe(nid => {
        this.selectedRequestId = nid;
        this.isModalOpen = true;
      });
    } else {
      this.selectedRequestId = id;
      this.isModalOpen = true;
    }
  }

  closeModal() {
    this.isModalOpen = false;
    this.loadData();
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

  trackByRowId(index: number, itemOrRow: VehicleRequest | import('@tanstack/angular-table').Row<VehicleRequest>): string {
    const item = 'original' in itemOrRow ? itemOrRow.original : itemOrRow;
    return `${item.id}-${index}`;
  }

  getStatusClass(status: string): string {
    return StatusUtil.getStatusBadgeClass(status);
  }

  setPageSize(size: number) {
    this.listing.pageSize.set(size);
    this.listing.currentPage.set(0);
  }

  goToPage(page: number) {
    this.listing.currentPage.set(page);
  }
}
