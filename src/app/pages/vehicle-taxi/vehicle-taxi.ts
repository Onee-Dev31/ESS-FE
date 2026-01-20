import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleTaxiFormComponent } from '../../components/features/vehicle-taxi-form/vehicle-taxi-form';
import {
  createAngularTable,
  getCoreRowModel,
  SortingState,
} from '@tanstack/angular-table';

interface TaxiItem {
  requestDate: string;
  desc: string;
  destination: string;
  distance: number;
  amount: number;
}

interface TaxiRequest {
  id: string;
  createDate: string;
  status: string;
  items: TaxiItem[];
}

@Component({
  selector: 'app-vehicle-taxi',
  standalone: true,
  imports: [CommonModule, FormsModule, VehicleTaxiFormComponent],
  templateUrl: './vehicle-taxi.html',
  styleUrl: './vehicle-taxi.scss',
})
export class VehicleTaxiComponent {
  filterStartDate: string = '';
  filterEndDate: string = '';
  filterStatus: string = '';
  isModalOpen: boolean = false;
  selectedRequestId: string = '';

  // Data Mockup
  allRequests = signal<TaxiRequest[]>([
    {
      id: '2701#001',
      createDate: '15/01/2026',
      status: 'รอตรวจสอบ',
      items: [
        { requestDate: '27/10/2026', desc: 'ถ่ายงานหลังรายการแฉ', destination: 'Bravo Studio', distance: 10.00, amount: 120 },
        { requestDate: '22/10/2026', desc: 'สแตนด์บายงาน', destination: 'GMM Studio', distance: 4.50, amount: 120 },
        { requestDate: '15/10/2026', desc: 'ทดสอบการเบิก', destination: 'สักที่', distance: 2.00, amount: 120 },
        { requestDate: '01/10/2026', desc: 'ทดสอบการเบิก', destination: 'สักแห่ง', distance: 5.00, amount: 120 }
      ]
    },
    {
      id: '2701#002',
      createDate: '17/01/2026',
      status: 'ต้นสังกัดอนุมัติ',
      items: [
        { requestDate: '27/10/2026', desc: 'ทดสอบ1', destination: 'สักหน', distance: 6.25, amount: 120 },
        { requestDate: '28/10/2026', desc: 'ทดสอบ2', destination: 'Some where', distance: 7.75, amount: 120 },
        { requestDate: '29/10/2026', desc: 'ทดสอบ3', destination: 'ไปห้าง', distance: 100.00, amount: 120 },
        { requestDate: '30/10/2026', desc: 'ทดสอบ4', destination: 'ไปสวนสัตว์', distance: 1.00, amount: 120 }
      ]
    }
  ]);

  sorting = signal<SortingState>([{ id: 'id', desc: true }]);

  // Computed Logic สำหรับ Filter และ Sort
  processedData = computed(() => {
    let filtered = [...this.allRequests()];

    // 1. Filter
    if (this.filterStatus) filtered = filtered.filter(r => r.status === this.filterStatus);
    
    // Note: วันที่ใน mock เป็น dd/MM/yyyy ต้องแปลง format ก่อนเทียบ
    if (this.filterStartDate || this.filterEndDate) {
      filtered = filtered.filter(r => {
        const [day, month, year] = r.createDate.split('/');
        const isoDate = `${year}-${month}-${day}`; // yyyy-MM-dd
        
        let passStart = true;
        let passEnd = true;
        if (this.filterStartDate) passStart = isoDate >= this.filterStartDate;
        if (this.filterEndDate) passEnd = isoDate <= this.filterEndDate;
        return passStart && passEnd;
      });
    }

    // 2. Sort Groups
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
             // แปลง dd/MM/yyyy -> yyyyMMdd เพื่อ sort
            valA = a.createDate.split('/').reverse().join('');
            valB = b.createDate.split('/').reverse().join('');
            return valA.localeCompare(valB) * direction;

          case 'status':
            return a.status.localeCompare(b.status) * direction;

          case 'amount':
            // Sort ด้วยยอดเงินรวม
            valA = a.items.reduce((sum, i) => sum + i.amount, 0);
            valB = b.items.reduce((sum, i) => sum + i.amount, 0);
            return (valA - valB) * direction;

          case 'distance':
            // Sort ด้วยระยะทางรวม
            valA = a.items.reduce((sum, i) => sum + i.distance, 0);
            valB = b.items.reduce((sum, i) => sum + i.distance, 0);
            return (valA - valB) * direction;

          case 'requestDate':
            // ใช้วันที่แรกสุดของรายการ
            valA = a.items[0]?.requestDate.split('/').reverse().join('') || '';
            valB = b.items[0]?.requestDate.split('/').reverse().join('') || '';
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
        // Column อื่นๆ จัดการ manual ใน html
    ],
    state: { sorting: this.sorting() },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(this.sorting()) : updater;
      this.sorting.set(next);
    },
    getCoreRowModel: getCoreRowModel(),
  }));

  onSearch() {
    this.allRequests.set([...this.allRequests()]);
  }

  // --- Helpers ---

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
    this.selectedRequestId = id;
    this.isModalOpen = true; 
  }
  
  closeModal() { 
    this.isModalOpen = false; 
    this.selectedRequestId = '';
  }

  deleteRequest(id: string) {
    if(confirm('ยืนยันการลบรายการ ' + id)) {
        this.allRequests.update(reqs => reqs.filter(r => r.id !== id));
    }
  }
}