import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { AllowanceFormComponent } from '../../components/features/allowance-form/allowance-form';
import {
  getCoreRowModel,
  getSortedRowModel,
  createAngularTable,
  SortingState,
} from '@tanstack/angular-table';

interface AllowanceItem {
  date: string;
  desc: string;
  hours: number;
  amount: number;
}

interface AllowanceRequest {
  id: string;
  createDate: string;
  status: string;
  items: AllowanceItem[];
}

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
  isModalOpen = false;
  filterStartDate = '';
  filterEndDate = '';
  filterStatus = '';
  
  allRequests = signal<AllowanceRequest[]>([
    { id: '2701-001', createDate: '2026-01-15', status: 'รอตรวจสอบ', items: [{ date: '27/10/2025', desc: 'ถ่ายงานหลังรายการแฉ', hours: 2, amount: 150 }] },
    { id: '2701-002', createDate: '2026-01-16', status: 'ต้นสังกัดอนุมัติ', items: [{ date: '22/10/2025', desc: 'สแตนด์บายงาน', hours: 2, amount: 150 }] },
    { id: '2701-003', createDate: '2026-01-17', status: 'รอจ่าย', items: [{ date: '15/10/2025', desc: 'ทดสอบการเบิก', hours: 2, amount: 150 } ]},
    { id: '2701-004', createDate: '2026-01-16', status: 'จ่ายแล้ว', items: [{ date: '10/01/2025', desc: 'ทดสอบการเบิก', hours: 2, amount: 150 }] }
  ]);

  processedData = computed(() => {
    let filtered = [...this.allRequests()];
    
    if (this.filterStatus) filtered = filtered.filter(r => r.status === this.filterStatus);
    if (this.filterStartDate) filtered = filtered.filter(r => r.createDate >= this.filterStartDate);
    if (this.filterEndDate) filtered = filtered.filter(r => r.createDate <= this.filterEndDate);

    const rows: FlatAllowanceRow[] = [];
    filtered.forEach(req => {
      req.items.forEach((item, index) => {
        rows.push({
          ...item,
          requestId: req.id,
          createDate: req.createDate,
          status: req.status,
          isFirstInGroup: index === 0,
          groupLength: req.items.length
        });
      });
    });
    return rows;
  });

  sorting = signal<SortingState>([{ id: 'requestId', desc: true }]);

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
    getSortedRowModel: getSortedRowModel(),
  }));

  ngOnInit() {}

  openModal() { this.isModalOpen = true; }
  closeModal() { this.isModalOpen = false; }
  
  onSearch() {
    this.allRequests.set([...this.allRequests()]);
  }

  sortByRequestId() {
    const col = this.table.getColumn('requestId');
    if (col) col.toggleSorting(col.getIsSorted() === 'asc');
  }

  getStatusClass(status: string): string {
    const statusMap: Record<string, string> = { 
      'รอตรวจสอบ': 'status-pending', 
      'ต้นสังกัดอนุมัติ': 'status-approved', 
      'รอจ่าย': 'status-waiting', 
      'จ่ายแล้ว': 'status-success' 
    };
    return statusMap[status] || '';
  }
}