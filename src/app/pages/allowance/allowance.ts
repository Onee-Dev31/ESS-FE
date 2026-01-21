import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AllowanceFormComponent } from '../../components/features/allowance-form/allowance-form';
import { VehicleService, AllowanceRequest, AllowanceItem } from '../../services/vehicle.service';
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

@Component({
  selector: 'app-allowance',
  standalone: true,
  imports: [CommonModule, FormsModule, AllowanceFormComponent],
  templateUrl: './allowance.html',
  styleUrl: './allowance.scss',
})
export class AllowanceComponent implements OnInit {
  private vehicleService = inject(VehicleService);

  isModalOpen = false;
  selectedRequestId = ''; // For passing to modal
  filterStartDate = '';
  filterEndDate = '';
  filterStatus = '';

  // เก็บข้อมูลดิบจาก API
  allRequests = signal<AllowanceRequest[]>([]);

  sorting = signal<SortingState>([{ id: 'requestId', desc: true }]);

  processedData = computed(() => {
    let filtered = [...this.allRequests()];

    if (this.filterStatus) filtered = filtered.filter((r) => r.status === this.filterStatus);
    if (this.filterStartDate) filtered = filtered.filter((r) => r.createDate >= this.filterStartDate);
    if (this.filterEndDate) filtered = filtered.filter((r) => r.createDate <= this.filterEndDate);

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
          case 'desc':
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

  table = createAngularTable(() => ({
    data: this.processedData(),
    columns: [
      { accessorKey: 'requestId', header: 'เลขที่การเบิก' },
      { accessorKey: 'createDate', header: 'วันที่สร้างรายการ' },
      { accessorKey: 'date', header: 'วันที่ขอเบิก' },
      { accessorKey: 'desc', header: 'รายละเอียด' },
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
  }));

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
  onSearch() {
    // ฟังก์ชันค้นหา (ข้อมูลจะถูก filter ผ่าน computed signal)
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

  getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      'รอตรวจสอบ': 'status-pending',
      'ต้นสังกัดอนุมัติ': 'status-approved',
      'รอจ่าย': 'status-waiting',
      'จ่ายแล้ว': 'status-success',
    };
    return statusMap[status] || '';
  }
}