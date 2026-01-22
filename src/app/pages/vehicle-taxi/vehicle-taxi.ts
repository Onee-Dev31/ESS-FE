import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleTaxiFormComponent } from '../../components/features/vehicle-taxi-form/vehicle-taxi-form';
import { FilePreviewModalComponent, FilePreviewItem } from '../../components/modals/file-preview-modal/file-preview-modal';
import { VehicleService, TaxiRequest, TaxiItem } from '../../services/vehicle.service';
import {
  createAngularTable,
  getCoreRowModel,
  getPaginationRowModel,
  SortingState,
} from '@tanstack/angular-table';

@Component({
  selector: 'app-vehicle-taxi',
  standalone: true,
  imports: [CommonModule, FormsModule, VehicleTaxiFormComponent, FilePreviewModalComponent],
  templateUrl: './vehicle-taxi.html',
  styleUrl: './vehicle-taxi.scss',
})
export class VehicleTaxiComponent implements OnInit {
  private vehicleService = inject(VehicleService);
  protected readonly Math = Math;

  filterStartDate = signal<string>('');
  filterEndDate = signal<string>('');
  filterStatus = signal<string>('');

  // Modal States
  isModalOpen: boolean = false;
  selectedRequestId: string = '';

  isPreviewModalOpen: boolean = false;
  previewFiles: FilePreviewItem[] = [];

  // [API-Refactor] Writable signal for taxi requests
  allRequests = signal<TaxiRequest[]>([]);

  sorting = signal<SortingState>([{ id: 'id', desc: true }]);

  processedData = computed(() => {
    let filtered = [...this.allRequests()];
    if (this.filterStatus()) filtered = filtered.filter(r => r.status === this.filterStatus());

    if (this.filterStartDate() || this.filterEndDate()) {
      filtered = filtered.filter(r => {
        const [day, month, year] = r.createDate.split('/');
        const isoDate = `${year}-${month}-${day}`;

        let passStart = true;
        let passEnd = true;
        if (this.filterStartDate()) passStart = isoDate >= this.filterStartDate();
        if (this.filterEndDate()) passEnd = isoDate <= this.filterEndDate();
        return passStart && passEnd;
      });
    }

    const sortState = this.sorting()[0];
    if (sortState) {
      const { id, desc } = sortState;
      const direction = desc ? -1 : 1;

      filtered.sort((a, b) => {
        let valA: any, valB: any;

        switch (id) {
          case 'id':
            return a.id.localeCompare(b.id) * direction;

          case 'createDate':
            valA = a.createDate.split('/').reverse().join('');
            valB = b.createDate.split('/').reverse().join('');
            return valA.localeCompare(valB) * direction;

          case 'status':
            return a.status.localeCompare(b.status) * direction;

          case 'amount':
            valA = a.items.reduce((sum, i) => sum + i.amount, 0);
            valB = b.items.reduce((sum, i) => sum + i.amount, 0);
            return (valA - valB) * direction;

          case 'distance':
            valA = a.items.reduce((sum, i) => sum + i.distance, 0);
            valB = b.items.reduce((sum, i) => sum + i.distance, 0);
            return (valA - valB) * direction;

          case 'date':
            valA = a.items[0]?.date.split('/').reverse().join('') || '';
            valB = b.items[0]?.date.split('/').reverse().join('') || '';
            return valA.localeCompare(valB) * direction;

          case 'desc':
            valA = a.items[0]?.desc || '';
            valB = b.items[0]?.desc || '';
            return valA.localeCompare(valB) * direction;

          case 'destination':
            valA = a.items[0]?.destination || '';
            valB = b.items[0]?.destination || '';
            return valA.localeCompare(valB) * direction;

          default:
            return 0;
        }
      });
    }
    return filtered;
  });

  table = createAngularTable(() => ({
    data: this.processedData(),
    columns: [
      { accessorKey: 'id', header: 'เลขที่การเบิก' },
      { accessorKey: 'createDate', header: 'วันที่สร้าง' },
      { accessorKey: 'status', header: 'สถานะ' },
    ],
    state: { sorting: this.sorting() },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(this.sorting()) : updater;
      this.sorting.set(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  }));

  ngOnInit() {
    // [API-Refactor] Subscribe to fetch info
    this.vehicleService.getTaxiRequests().subscribe(data => {
      this.allRequests.set(data);
    });
  }

  onSearch() {
  }

  clearFilters() {
    this.filterStartDate.set('');
    this.filterEndDate.set('');
    this.filterStatus.set('');
  }

  toggleSort(columnId: string) {
    const currentSort = this.sorting()[0];
    if (currentSort?.id === columnId) {
      this.sorting.set([{ id: columnId, desc: !currentSort.desc }]);
    } else {
      this.sorting.set([{ id: columnId, desc: false }]); // Default Ascending
    }
  }

  getSortIcon(columnId: string) {
    const sortState = this.sorting()[0];
    const isSorted = sortState?.id === columnId ? (sortState.desc ? 'desc' : 'asc') : false;
    return {
      'fa-sort-amount-up': isSorted === 'asc',
      'fa-sort-amount-down-alt': isSorted === 'desc',
      'fa-sort': !isSorted,
      'text-muted': !isSorted
    };
  }

  getStatusClass(status: string) {
    switch (status) {
      case 'รอตรวจสอบ': return 'status-pending';
      case 'ต้นสังกัดอนุมัติ': return 'status-dept';
      case 'HR อนุมัติ': return 'status-hr';
      case 'CEO อนุมัติ': return 'status-ceo';
      case 'ACC อนุมัติ': return 'status-success';
      default: return '';
    }
  }

  openModal(id: string = '') {
    if (id === '') {
      // [API-Refactor] Fetch ID Async
      this.vehicleService.generateNextTaxiId().subscribe(nid => {
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
    this.selectedRequestId = '';
  }

  deleteRequest(id: string) {
    if (confirm('ยืนยันการลบรายการ ' + id)) {
      // [API-Refactor] Delete Async
      this.vehicleService.deleteTaxiRequest(id).subscribe();
    }
  }

  openPreviewModal(items: TaxiItem[]) {
    // Extract files
    const files = items
      .filter(i => i.attachedFile)
      .map(i => ({
        fileName: i.attachedFile || '',
        date: i.date
      }));

    if (files.length === 0) {
      alert('ไม่มีไฟล์แนบในรายการนี้');
      return;
    }

    this.previewFiles = files;
    this.isPreviewModalOpen = true;
  }

  closePreviewModal() {
    this.isPreviewModalOpen = false;
    this.previewFiles = [];
  }
}