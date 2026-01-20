import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleFormComponent } from '../../components/features/vehicle-form/vehicle-form';
import { VehicleService, VehicleRequest } from '../../services/vehicle.service';
import {
  ColumnDef,
  getCoreRowModel,
  createAngularTable,
  SortingState,
} from '@tanstack/angular-table';

@Component({
  selector: 'app-vehicle',
  standalone: true,
  imports: [CommonModule, VehicleFormComponent, FormsModule],
  templateUrl: './vehicle.html',
  styleUrl: './vehicle.scss',
})
export class VehicleComponent implements OnInit {
  private vehicleService = inject(VehicleService);

  isModalOpen: boolean = false;
  selectedRequestId: string = '';
  filterStartDate: string = '';
  filterEndDate: string = '';
  filterStatus: string = '';

  // Use service signal directly or wrapping it if needed
  allRequests = this.vehicleService.getRequests();

  sorting = signal<SortingState>([{ id: 'id', desc: true }]);

  processedData = computed(() => {
    let filtered = [...this.allRequests()];

    if (this.filterStatus) {
      filtered = filtered.filter(r => r.status === this.filterStatus);
    }
    if (this.filterStartDate) {
      filtered = filtered.filter(r => r.createDate >= this.filterStartDate);
    }
    if (this.filterEndDate) {
      filtered = filtered.filter(r => r.createDate <= this.filterEndDate);
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
            return a.createDate.localeCompare(b.createDate) * direction;
          case 'status':
            return a.status.localeCompare(b.status) * direction;
          case 'amount':
            valA = a.items.reduce((sum, item) => sum + item.amount, 0);
            valB = b.items.reduce((sum, item) => sum + item.amount, 0);
            return (valA - valB) * direction;
          case 'date':
            valA = a.items[0]?.date || '';
            valB = b.items[0]?.date || '';
            const dA = valA.split('/').reverse().join('');
            const dB = valB.split('/').reverse().join('');
            return dA.localeCompare(dB) * direction;
          case 'desc':
            valA = a.items[0]?.desc || '';
            valB = b.items[0]?.desc || '';
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
      { accessorKey: 'createDate', header: 'วันที่สร้างรายการ' },
      { accessorKey: 'items', header: 'รายละเอียด' },
      { accessorKey: 'status', header: 'สถานะ' },
    ],
    state: {
      sorting: this.sorting(),
    },
    onSortingChange: (updaterOrValue) => {
      const nextSorting = typeof updaterOrValue === 'function'
        ? updaterOrValue(this.sorting())
        : updaterOrValue;
      this.sorting.set(nextSorting);
    },
    getCoreRowModel: getCoreRowModel(),
  }));

  ngOnInit() { }

  onSearch() {
    // Current filtering is reactive via signals, so explicit set() might not be needed
    // unless we want to trigger something else. 
    // Data updates automatically because processedData depends on allRequests() and filter signals.
  }

  deleteRequest(id: string) {
    if (confirm(`ยืนยันการลบรายการ ${id}?`)) {
      this.vehicleService.deleteRequest(id);
    }
  }

  toggleSort(columnId: string) {
    const column = this.table.getColumn(columnId);
    if (column) {
      column.toggleSorting(column.getIsSorted() === 'asc');
    } else {
      const currentSort = this.sorting()[0];
      if (currentSort?.id === columnId) {
        this.sorting.set([{ id: columnId, desc: !currentSort.desc }]);
      } else {
        this.sorting.set([{ id: columnId, desc: false }]);
      }
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

  openModal(id: string = '') {
    if (id === '') {
      this.selectedRequestId = this.vehicleService.generateNextId();
    } else {
      this.selectedRequestId = id;
    }
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedRequestId = '';
  }

  getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      'รอตรวจสอบ': 'status-pending',
      'ต้นสังกัดอนุมัติ': 'status-dept',
      'HR อนุมัติ': 'status-hr',
      'CEO อนุมัติ': 'status-ceo',
      'ACC อนุมัติ': 'status-success',
    };
    return statusMap[status] || '';
  }
}