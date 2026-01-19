import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { VehicleFormComponent } from '../../components/features/vehicle-form/vehicle-form';
import {
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  createAngularTable,
  SortingState,
} from '@tanstack/angular-table';

interface RequestItem {
  date: string;
  desc: string;
  amount: number;
}

interface VehicleRequest {
  id: string;
  createDate: string;
  status: string;
  items: RequestItem[];
}

@Component({
  selector: 'app-vehicle',
  standalone: true,
  imports: [CommonModule, VehicleFormComponent, FormsModule],
  templateUrl: './vehicle.html',
  styleUrl: './vehicle.scss',
})
export class VehicleComponent implements OnInit {
  isModalOpen: boolean = false;
  selectedRequestId: string = '';

  // สำหรับฟังก์ชันค้นหา
  filterStartDate: string = '';
  filterEndDate: string = '';
  filterStatus: string = '';
  
  // ข้อมูล Mockup ทั้งหมด
  allRequests: VehicleRequest[] = [
    {
      id: '2701#001',
      createDate: '2026-01-15', 
      status: 'รอตรวจสอบ',
      items: [
        { date: '27/10/2026', desc: 'ถ่ายงานหลังรายการแฉ', amount: 120 },
        { date: '22/10/2026', desc: 'สแตนด์บายงาน', amount: 120 },
        { date: '15/10/2026', desc: 'ทดสอบการเบิก', amount: 120 },
        { date: '01/10/2026', desc: 'ทดสอบการเบิก', amount: 120 },
      ],
    },
    {
      id: '2701#002',
      createDate: '2026-01-17',
      status: 'ต้นสังกัดอนุมัติ',
      items: [
        { date: '27/10/2026', desc: 'ทดสอบ 1', amount: 120 },
        { date: '28/10/2026', desc: 'ทดสอบ 2', amount: 120 },
        { date: '29/10/2026', desc: 'ทดสอบ 3', amount: 120 },
        { date: '30/10/2026', desc: 'ทดสอบ 4', amount: 120 },
      ],
    }
  ];

  data = signal<VehicleRequest[]>([]);
  sorting = signal<SortingState>([{ id: 'id', desc: true }]);

  columns: ColumnDef<VehicleRequest>[] = [
    { accessorKey: 'id', header: 'เลขที่การเบิก' },
    { accessorKey: 'createDate', header: 'วันที่สร้างรายการ' },
    { accessorKey: 'status', header: 'สถานะ' },
  ];

  table = createAngularTable(() => ({
    data: this.data(),
    columns: this.columns,
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
    getSortedRowModel: getSortedRowModel(),
  }));

  ngOnInit() {
    this.data.set([...this.allRequests]);
  }

  onSearch() {
    let filtered = [...this.allRequests];
    if (this.filterStatus) {
      filtered = filtered.filter(r => r.status === this.filterStatus);
    }
    if (this.filterStartDate) {
      filtered = filtered.filter(r => r.createDate >= this.filterStartDate);
    }
    if (this.filterEndDate) {
      filtered = filtered.filter(r => r.createDate <= this.filterEndDate);
    }
    this.data.set(filtered);
  }

  deleteRequest(id: string) {
    if(confirm(`ยืนยันการลบรายการ ${id}?`)) {
      this.allRequests = this.allRequests.filter(r => r.id !== id);
      this.onSearch();
    }
  }

  sortByRequestId() {
    const column = this.table.getColumn('id');
    if (column) {
      // Toggle ระหว่าง asc -> desc -> clear
      column.toggleSorting(column.getIsSorted() === 'asc');
    }
  }

  openCreateModal(id: string = '') {
    if (id === '') {
      const lastIdNum = this.allRequests.reduce((max, item) => {
        const num = parseInt(item.id.split('#')[1] || '0');
        return num > max ? num : max;
      }, 0);
      const nextNum = (lastIdNum + 1).toString().padStart(3, '0');
      this.selectedRequestId = `2701#${nextNum}`;
    } else {
      this.selectedRequestId = id;
    }
    this.isModalOpen = true; 
  }
  
  closeCreateModal() { 
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