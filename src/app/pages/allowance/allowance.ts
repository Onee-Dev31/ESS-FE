import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AllowanceFormComponent } from '../../components/features/allowance-form/allowance-form';
import { VehicleService, AllowanceRequest, AllowanceItem } from '../../services/vehicle.service';
import {
  createAngularTable,
  getCoreRowModel,
  getPaginationRowModel,
  SortingState,
} from '@tanstack/angular-table';

interface FlatAllowanceRow extends AllowanceItem {
  requestId: string;
  createDate: string;
  status: string;
  isFirstInGroup: boolean;
  groupLength: number;
}

@Component({
  selector: 'app-allowance',
  standalone: true,
  imports: [CommonModule, FormsModule, AllowanceFormComponent],
  templateUrl: './allowance.html',
  styleUrl: './allowance.scss',
})
export class AllowanceComponent implements OnInit {
  private vehicleService = inject(VehicleService);
  private router = inject(Router);

  goBack() {
    this.router.navigate(['/dashboard']);
  }
  protected readonly Math = Math;

  isModalOpen = false;
  selectedRequestId = ''; // สำหรับส่งค่าไปยัง Modal
  filterStartDate = signal<string>('');
  filterEndDate = signal<string>('');
  filterStatus = signal<string>('');

  // เก็บข้อมูลดิบจาก API
  allRequests = signal<AllowanceRequest[]>([]);

  sorting = signal<SortingState>([{ id: 'requestId', desc: true }]);

  // Pagination state for request-based pagination
  currentPage = signal<number>(0);
  pageSize = signal<number>(10);

  processedData = computed(() => {
    let filtered = [...this.allRequests()];

    if (this.filterStatus()) {
      filtered = filtered.filter((r) => {
        const mapped = this.mapStatus(r.status);
        return mapped === this.filterStatus();
      });
    }

    const sortState = this.sorting()[0];
    if (sortState) {
      const { id, desc } = sortState;
      const direction = desc ? -1 : 1;

      filtered.sort((a, b) => {
        let valA: any, valB: any;

        switch (id) {
          case 'requestId':
            return a.id.localeCompare(b.id) * direction;
          case 'createDate':
            return a.createDate.localeCompare(b.createDate) * direction;
          case 'status':
            return a.status.localeCompare(b.status) * direction;
          case 'amount':
            valA = a.items.reduce((sum, item) => sum + item.amount, 0);
            valB = b.items.reduce((sum, item) => sum + item.amount, 0);
            return (valA - valB) * direction;
          case 'hours':
            valA = a.items.reduce((sum, item) => sum + item.hours, 0);
            valB = b.items.reduce((sum, item) => sum + item.hours, 0);
            return (valA - valB) * direction;
          case 'date':
            valA = a.items[0]?.date || '';
            valB = b.items[0]?.date || '';
            const dateA = valA.split('/').reverse().join('');
            const dateB = valB.split('/').reverse().join('');
            return dateA.localeCompare(dateB) * direction;
          case 'description':
            valA = a.items[0]?.description || '';
            valB = b.items[0]?.description || '';
            return valA.localeCompare(valB) * direction;
          default:
            return 0;
        }
      });
    }

    const rows: FlatAllowanceRow[] = [];
    filtered.forEach((req) => {

      req.items.forEach((item, index) => {
        rows.push({
          ...item,
          requestId: req.id,
          createDate: req.createDate,
          status: req.status,
          isFirstInGroup: index === 0,
          groupLength: req.items.length,
        });
      });
    });
    return rows;
  });

  // Get unique requests for pagination
  paginatedRequests = computed(() => {
    const allReqs = [...this.allRequests()];

    // Apply filters
    let filtered = allReqs;
    if (this.filterStatus()) {
      filtered = filtered.filter(r => r.status === this.filterStatus());
    }
    if (this.filterStartDate()) {
      filtered = filtered.filter(r => r.createDate >= this.filterStartDate());
    }
    if (this.filterEndDate()) {
      filtered = filtered.filter(r => r.createDate <= this.filterEndDate());
    }

    // Apply sorting
    const sortState = this.sorting()[0];
    if (sortState) {
      const { id, desc } = sortState;
      const direction = desc ? -1 : 1;
      filtered.sort((a, b) => {
        switch (id) {
          case 'requestId':
            return a.id.localeCompare(b.id) * direction;
          case 'createDate':
            return a.createDate.localeCompare(b.createDate) * direction;
          default:
            return 0;
        }
      });
    }

    // Paginate by unique requests
    const start = this.currentPage() * this.pageSize();
    const end = start + this.pageSize();
    return filtered.slice(start, end);
  });

  // Flatten only the paginated requests
  displayedRows = computed(() => {
    const rows: FlatAllowanceRow[] = [];
    this.paginatedRequests().forEach((req) => {
      req.items.forEach((item, index) => {
        rows.push({
          ...item,
          requestId: req.id,
          createDate: req.createDate,
          status: req.status,
          isFirstInGroup: index === 0,
          groupLength: req.items.length,
        });
      });
    });
    return rows;
  });

  totalRequests = computed(() => {
    let filtered = [...this.allRequests()];
    if (this.filterStatus()) {
      filtered = filtered.filter(r => r.status === this.filterStatus());
    }
    if (this.filterStartDate()) {
      filtered = filtered.filter(r => r.createDate >= this.filterStartDate());
    }
    if (this.filterEndDate()) {
      filtered = filtered.filter(r => r.createDate <= this.filterEndDate());
    }
    return filtered.length;
  });

  totalPages = computed(() => Math.ceil(this.totalRequests() / this.pageSize()));

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

  // Pagination methods
  setPageSize(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(0);
  }

  nextPage() {
    if (this.canNextPage()) {
      this.currentPage.update(p => p + 1);
    }
  }

  previousPage() {
    if (this.canPreviousPage()) {
      this.currentPage.update(p => p - 1);
    }
  }

  goToPage(page: number) {
    this.currentPage.set(Math.max(0, Math.min(page, this.totalPages() - 1)));
  }

  canNextPage() {
    return this.currentPage() < this.totalPages() - 1;
  }

  canPreviousPage() {
    return this.currentPage() > 0;
  }

  ngOnInit() {
    // ดึงข้อมูลการเบิกจาก Service
    this.vehicleService.getAllowanceRequests().subscribe(data => {
      this.allRequests.set(data);
    });
  }

  openModal(id: string = '') {
    if (id === '') {
      // สร้างเลขที่เอกสารใหม่
      this.vehicleService.generateNextAllowanceId().subscribe(nid => {
        this.selectedRequestId = nid;
        this.isModalOpen = true;
      });
    } else {
      this.selectedRequestId = id;
      this.isModalOpen = true;
    }
  }
  closeModal() { this.isModalOpen = false; }
  clearFilters() {
    this.filterStartDate.set('');
    this.filterEndDate.set('');
    this.filterStatus.set('');
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
    // Create a unique key from request ID, date, and index to ensure stability
    const original = row.original || row;
    return `${original.requestId}-${original.date}-${index}`;
  }

  public getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      'คำขอใหม่': 'status-new',
      'ตรวจสอบแล้ว': 'status-verified',
      'อยู่ระหว่างการอนุมัติ': 'status-pending',
      'อนุมัติแล้ว': 'status-success',
    };
    return statusMap[status] || '';
  }

  private mapStatus(status: string): string {
    const s = status?.trim();
    return s; // Data is already clean from service
  }
}