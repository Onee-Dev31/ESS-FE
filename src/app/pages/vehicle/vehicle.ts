import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransportService, VehicleRequest } from '../../services/transport.service';
import { AlertService } from '../../services/alert.service';
import { VehicleFormComponent } from '../../components/features/vehicle-form/vehicle-form';
import { StatusUtil } from '../../utils/status.util';
import { createListingState, createListingComputeds, clearListingFilters } from '../../utils/listing.util';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import {
  createAngularTable,
  getCoreRowModel,
  SortingState,
} from '@tanstack/angular-table';

import { StatusLabelPipe } from '../../pipes/status-label.pipe';

@Component({
  selector: 'app-vehicle',
  standalone: true,
  imports: [CommonModule, FormsModule, VehicleFormComponent, StatusLabelPipe, PaginationComponent, PageHeaderComponent],
  templateUrl: './vehicle.html',
  styleUrl: './vehicle.scss',
})
export class VehicleComponent implements OnInit {
  private transportService = inject(TransportService);
  private alertService = inject(AlertService);
  private router = inject(Router);

  protected readonly Math = Math;

  isModalOpen = false;
  selectedRequestId = '';

  allRequests = signal<VehicleRequest[]>([]);
  sorting = signal<SortingState>([{ id: 'id', desc: true }]);

  // ใช้ Utility จัดการ State
  listing = createListingState();

  // Custom sorting logic for processedData
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
      const direction = desc ? -1 : 1;
      filtered.sort((requestA, requestB) => {
        switch (id) {
          case 'id':
            return requestA.id.localeCompare(requestB.id) * direction;
          case 'createDate':
            return requestA.createDate.localeCompare(requestB.createDate) * direction;
          case 'date': {
            const dateA = requestA.items[0]?.date || '';
            const dateB = requestB.items[0]?.date || '';
            return dateA.localeCompare(dateB) * direction;
          }
          case 'desc': {
            const descA = requestA.items[0]?.description || '';
            const descB = requestB.items[0]?.description || '';
            return descA.localeCompare(descB) * direction;
          }
          case 'amount': {
            const amountA = requestA.items.reduce((sum, item) => sum + item.amount, 0);
            const amountB = requestB.items.reduce((sum, item) => sum + item.amount, 0);
            return (amountA - amountB) * direction;
          }
          case 'status':
            return requestA.status.localeCompare(requestB.status) * direction;
          default:
            return 0;
        }
      });
    }
    return filtered;
  });

  // ใช้ Utility สำหรับ Pagination logic
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

  loadData() {
    this.transportService.getRequests().subscribe(data => {
      this.allRequests.set(data);
    });
  }

  deleteRequest(id: string) {
    if (confirm('ยืนยันการลบรายการเบิกเลขที่ ' + id)) {
      this.transportService.deleteRequest(id).subscribe(() => {
        this.alertService.showSuccess('ลบรายการเบิกเรียบร้อยแล้ว');
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
    return `${original.id}-${index}`;
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
