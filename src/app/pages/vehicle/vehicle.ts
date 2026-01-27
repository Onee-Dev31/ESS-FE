import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransportService, VehicleRequest } from '../../services/transport.service';
import { AlertService } from '../../services/alert.service';
import { VehicleService } from '../../services/vehicle.service';
import { VehicleFormComponent } from '../../components/features/vehicle-form/vehicle-form';
import {
  createAngularTable,
  getCoreRowModel,
  SortingState,
  getPaginationRowModel,
} from '@tanstack/angular-table';

@Component({
  selector: 'app-vehicle',
  standalone: true,
  imports: [CommonModule, FormsModule, VehicleFormComponent],
  templateUrl: './vehicle.html',
  styleUrl: './vehicle.scss',
})
export class VehicleComponent implements OnInit {
  private transportService = inject(TransportService);
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

  allRequests = signal<VehicleRequest[]>([]);
  sorting = signal<SortingState>([{ id: 'id', desc: true }]);

  currentPage = signal<number>(0);
  pageSize = signal<number>(10);

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
          case 'id':
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

  totalRequests = computed(() => this.processedData().length);
  totalPages = computed(() => Math.ceil(this.totalRequests() / this.pageSize()));

  table = createAngularTable(() => ({
    data: this.paginatedRequests(),
    columns: [
      { accessorKey: 'id', header: 'เลขที่การเบิก' },
      { accessorKey: 'createDate', header: 'วันที่สร้างรายการ' },
      { accessorKey: 'status', header: 'สถานะ' },
    ],
    state: { sorting: this.sorting() },
    onSortingChange: (updaterOrValue) => {
      const next = typeof updaterOrValue === 'function' ? updaterOrValue(this.sorting()) : updaterOrValue;
      this.sorting.set(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
  }));

  ngOnInit() {
    this.loadData();
  }

  // โหลดข้อมูลคำขอค่าเดินทางทั้งหมด
  loadData() {
    this.transportService.getRequests().subscribe(data => {
      this.allRequests.set(data);
    });
  }

  // ลบรายการคำขอ
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
    this.filterStartDate.set('');
    this.filterEndDate.set('');
    this.filterStatus.set('');
  }

  // สลับการเรียงลำดับข้อมูลในตาราง
  toggleSort(columnId: string) {
    const currentSort = this.sorting()[0];
    if (currentSort?.id === columnId) {
      this.sorting.set([{ id: columnId, desc: !currentSort.desc }]);
    } else {
      this.sorting.set([{ id: columnId, desc: false }]);
    }
  }

  getSortIcon(columnId: string) {
    const sortState = this.sorting()[0];
    const isSorted = sortState?.id === columnId ? (sortState.desc ? 'desc' : 'asc') : false;
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

  public getStatusClass(status: string): string {
    return this.vehicleService.getStatusBadgeClass(status);
  }
}
