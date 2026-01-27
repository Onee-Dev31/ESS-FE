import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaxiService, TaxiRequest, TaxiItem } from '../../services/taxi.service';
import { AlertService } from '../../services/alert.service';
import { VehicleService } from '../../services/vehicle.service';
import { VehicleTaxiFormComponent } from '../../components/features/vehicle-taxi-form/vehicle-taxi-form';
import { FilePreviewModalComponent } from '../../components/modals/file-preview-modal/file-preview-modal';
import {
  createAngularTable,
  getCoreRowModel,
  SortingState,
  getPaginationRowModel,
} from '@tanstack/angular-table';

interface FlatTaxiRow extends TaxiItem {
  requestId: string;
  createDate: string;
  status: string;
  isFirstInGroup: boolean;
  groupLength: number;
}

@Component({
  selector: 'app-vehicle-taxi',
  standalone: true,
  imports: [CommonModule, FormsModule, VehicleTaxiFormComponent, FilePreviewModalComponent],
  templateUrl: './vehicle-taxi.html',
  styleUrl: './vehicle-taxi.scss',
})
export class VehicleTaxiComponent implements OnInit {
  private taxiService = inject(TaxiService);
  private alertService = inject(AlertService);
  private vehicleService = inject(VehicleService);
  private router = inject(Router);

  goBack() {
    this.router.navigate(['/dashboard']);
  }
  protected readonly Math = Math;

  isModalOpen = false;
  selectedRequestId = '';
  filterStartDate = signal<string>('');
  filterEndDate = signal<string>('');
  filterStatus = signal<string>('');

  isPreviewModalOpen = false;
  previewFiles: any[] = [];

  allRequests = signal<TaxiRequest[]>([]);
  sorting = signal<SortingState>([{ id: 'requestId', desc: true }]);

  currentPage = signal<number>(0);
  pageSize = signal<number>(10);

  // กรองและเรียงลำดับข้อมูลคำขอค่าแท็กซี่
  processedData = computed(() => {
    const allReqs = [...this.allRequests()];
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

    return filtered;
  });

  paginatedRequests = computed(() => {
    const filtered = this.processedData();
    const start = this.currentPage() * this.pageSize();
    const end = start + this.pageSize();
    return filtered.slice(start, end);
  });

  displayedRows = computed(() => {
    const rows: FlatTaxiRow[] = [];
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

  totalRequests = computed(() => this.processedData().length);
  totalPages = computed(() => Math.ceil(this.totalRequests() / this.pageSize()));

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
    state: {
      sorting: this.sorting(),
      pagination: {
        pageIndex: this.currentPage(),
        pageSize: this.pageSize(),
      },
    },
    pageCount: this.totalPages(),
    onPaginationChange: (updaterOrValue) => {
      const prev = {
        pageIndex: this.currentPage(),
        pageSize: this.pageSize(),
      };
      const next = typeof updaterOrValue === 'function' ? updaterOrValue(prev) : updaterOrValue;
      this.currentPage.set(next.pageIndex);
      this.pageSize.set(next.pageSize);
    },
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
    this.taxiService.getTaxiRequests().subscribe(data => {
      this.allRequests.set(data);
    });
  }

  // ลบรายการคำขอ
  deleteRequest(id: string) {
    if (confirm('ยืนยันการลบรายการเบิกเลขที่ ' + id)) {
      this.taxiService.deleteTaxiRequest(id).subscribe(() => {
        this.alertService.showSuccess('ลบรายการเบิกเรียบร้อยแล้ว');
        this.loadData();
      });
    }
  }

  openModal(id: string = '') {
    if (id === '') {
      this.taxiService.generateNextTaxiId().subscribe(nid => {
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

  // เปิด Modal เพื่อดูไฟล์แนบของคำขอนั้นๆ
  openPreviewModalForRequest(requestId: string) {
    const request = this.allRequests().find(r => r.id === requestId);
    if (request && request.items) {
      this.previewFiles = request.items
        .filter(item => item.attachedFile)
        .map(item => ({
          fileName: item.attachedFile,
          date: item.date
        }));

      if (this.previewFiles.length > 0) {
        this.isPreviewModalOpen = true;
      } else {
        this.alertService.showWarning('ไม่พบไฟล์แนบสำหรับรายการนี้', 'ไม่พบไฟล์');
      }
    }
  }

  closePreviewModal() {
    this.isPreviewModalOpen = false;
    this.previewFiles = [];
  }

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

  trackByReqId(index: number, req: TaxiRequest): string {
    return req.id;
  }

  trackByRowId(index: number, row: any): string {
    const original = row.original || row;
    return `${original.requestId}-${original.date}-${index}`;
  }

  public getStatusClass(status: string): string {
    return this.vehicleService.getStatusBadgeClass(status);
  }
}
