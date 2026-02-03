import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AllowanceFormComponent } from '../../components/features/allowance-form/allowance-form';
import { AllowanceService } from '../../services/allowance.service';
import { AllowanceRequest, AllowanceItem } from '../../interfaces/allowance.interface';
import { AlertService } from '../../services/alert.service';
import { DateUtilityService } from '../../services/date-utility.service';
import { StatusUtil } from '../../utils/status.util';
import { createListingState, createListingComputeds, clearListingFilters } from '../../utils/listing.util';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { MedicalPolicyModalComponent } from '../../components/modals/medical-policy-modal/medical-policy-modal';
import {
  createAngularTable,
  getCoreRowModel,
  SortingState,
} from '@tanstack/angular-table';

interface FlatAllowanceRow extends AllowanceItem {
  requestId: string;
  createDate: string;
  status: string;
  isFirstInGroup: boolean;
  groupLength: number;
}

import { StatusLabelPipe } from '../../pipes/status-label.pipe';

@Component({
  selector: 'app-allowance',
  standalone: true,
  imports: [CommonModule, FormsModule, AllowanceFormComponent, StatusLabelPipe, PaginationComponent, PageHeaderComponent, MedicalPolicyModalComponent],
  templateUrl: './allowance.html',
  styleUrl: './allowance.scss',
})
export class AllowanceComponent implements OnInit {
  private allowanceService = inject(AllowanceService);
  private alertService = inject(AlertService);
  private dateUtil = inject(DateUtilityService);
  private router = inject(Router);

  protected readonly Math = Math;

  isModalOpen = false;
  isPolicyModalOpen = signal<boolean>(false);
  selectedRequestId = '';

  allRequests = signal<AllowanceRequest[]>([]);
  sorting = signal<SortingState>([{ id: 'requestId', desc: true }]);

  listing = createListingState();

  processedData = computed(() => {
    const list = [...this.allRequests()];
    const search = this.listing.searchText().toLowerCase();
    const status = this.listing.filterStatus();
    const start = this.listing.filterStartDate();
    const end = this.listing.filterEndDate();

    let filtered = list.filter(r => {
      const matchSearch = !search || r.id.toLowerCase().includes(search) ||
        r.items.some(item => item.description.toLowerCase().includes(search));
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
        let valueA: any, valueB: any;
        switch (id) {
          case 'requestId': return requestA.id.localeCompare(requestB.id) * direction;
          case 'createDate': return requestA.createDate.localeCompare(requestB.createDate) * direction;
          case 'status': return requestA.status.localeCompare(requestB.status) * direction;
          case 'amount':
            valueA = requestA.items.reduce((sum, i) => sum + i.amount, 0);
            valueB = requestB.items.reduce((sum, i) => sum + i.amount, 0);
            return (valueA - valueB) * direction;
          case 'hours':
            valueA = requestA.items.reduce((sum, i) => sum + i.hours, 0);
            valueB = requestB.items.reduce((sum, i) => sum + i.hours, 0);
            return (valueA - valueB) * direction;
          case 'date':
            valueA = requestA.items[0]?.date || '';
            valueB = requestB.items[0]?.date || '';
            return this.dateUtil.formatBEToISO(valueA).localeCompare(this.dateUtil.formatBEToISO(valueB)) * direction;
          case 'description':
            valueA = requestA.items[0]?.description || '';
            valueB = requestB.items[0]?.description || '';
            return valueA.localeCompare(valueB) * direction;
          default: return 0;
        }
      });
    }
    return filtered;
  });

  // ใช้ Utility สำหรับ Pagination logic ต่อจาก processedData
  comps = createListingComputeds(this.processedData, this.listing);

  displayedRows = computed(() => {
    const rows: FlatAllowanceRow[] = [];
    this.comps.paginatedData().forEach((request: AllowanceRequest) => {
      request.items.forEach((item: AllowanceItem, index: number) => {
        rows.push({
          ...item,
          requestId: request.id,
          createDate: request.createDate,
          status: request.status,
          isFirstInGroup: index === 0,
          groupLength: request.items.length,
        });
      });
    });
    return rows;
  });

  table = createAngularTable(() => ({
    data: this.displayedRows(),
    columns: [
      { accessorKey: 'requestId', header: 'เลขที่การเบิก' },
      { accessorKey: 'createDate', header: 'วันที่สร้างรายการ' },
      { accessorKey: 'date', header: 'วันที่ขอเบิก' },
      { accessorKey: 'description', header: 'รายละเอียด' },
      { accessorKey: 'hours', header: 'จำนวนชั่วโมง' },
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
    this.allowanceService.getAllowanceRequests().subscribe(data => {
      this.allRequests.set(data);
    });
  }

  openModal(id: string = '') {
    if (id === '') {
      this.allowanceService.generateNextAllowanceId().subscribe(nid => {
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

  trackByReqId(index: number, req: AllowanceRequest): string {
    return req.id;
  }

  trackByRowId(index: number, row: any): string {
    const original = row.original || row;
    return `${original.requestId}-${original.date}-${index}`;
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

  deleteRequest(id: string) {
    if (confirm(`คุณต้องการลบรายการ ${id} ใช่หรือไม่?`)) {
      this.allowanceService.deleteAllowanceRequest(id).subscribe(() => {
        this.alertService.showSuccess('ลบรายการเรียบร้อยแล้ว');
        this.loadData();
      });
    }
  }
}