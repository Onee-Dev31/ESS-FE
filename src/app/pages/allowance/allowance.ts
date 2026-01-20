import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AllowanceFormComponent } from '../../components/features/allowance-form/allowance-form';
import {
  createAngularTable,
  getCoreRowModel,
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

  // Data ต้นทาง (เป็น Group)
  allRequests = signal<AllowanceRequest[]>([
    {
      id: '2701-001',
      createDate: '2026-01-15',
      status: 'รอตรวจสอบ',
      items: [
        { date: '27/10/2025', desc: 'ถ่ายงาน A', hours: 2, amount: 150 },
        { date: '27/10/2025', desc: 'ถ่ายงาน B', hours: 2, amount: 150 },
        { date: '27/10/2025', desc: 'ถ่ายงาน C', hours: 2, amount: 150 },
      ],
    },
    {
      id: '2701-002',
      createDate: '2026-01-16',
      status: 'ต้นสังกัดอนุมัติ',
      items: [
        { date: '22/10/2025', desc: 'สแตนด์บายงาน', hours: 5, amount: 500 }, // ยอดสูง
        { date: '27/10/2025', desc: 'ถ่ายงาน D', hours: 2, amount: 150 },
      ],
    },
    {
      id: '2701-003',
      createDate: '2026-01-17',
      status: 'รอจ่าย',
      items: [
        { date: '15/10/2025', desc: 'ทดสอบการเบิก', hours: 1, amount: 100 },
      ],
    },
    {
      id: '2701-004',
      createDate: '2026-01-16',
      status: 'จ่ายแล้ว',
      items: [
        { date: '10/01/2025', desc: 'Test 1', hours: 2, amount: 150 },
        { date: '27/10/2025', desc: 'Test 2', hours: 2, amount: 150 },
      ],
    },
  ]);

  // Sorting State
  sorting = signal<SortingState>([{ id: 'requestId', desc: true }]);

  // Computed: ทำหน้าที่ Filter -> Sort Group -> Flatten
  processedData = computed(() => {
    let filtered = [...this.allRequests()];

    // 1. Filtering
    if (this.filterStatus) filtered = filtered.filter((r) => r.status === this.filterStatus);
    if (this.filterStartDate) filtered = filtered.filter((r) => r.createDate >= this.filterStartDate);
    if (this.filterEndDate) filtered = filtered.filter((r) => r.createDate <= this.filterEndDate);

    // 2. Sorting Groups (Logic สำคัญ: เรียงทั้งก้อน Group)
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
            // ถ้า Sort จำนวนเงิน: เอา "ยอดรวม" หรือ "ยอดสูงสุด" ใน Group มาเทียบกัน
            valA = a.items.reduce((sum, item) => sum + item.amount, 0);
            valB = b.items.reduce((sum, item) => sum + item.amount, 0);
            return (valA - valB) * direction;
          case 'hours':
             // Sort ชั่วโมง: เอาผลรวมชั่วโมงมาเทียบ
            valA = a.items.reduce((sum, item) => sum + item.hours, 0);
            valB = b.items.reduce((sum, item) => sum + item.hours, 0);
            return (valA - valB) * direction;
          case 'date': // วันที่ขอเบิก
             // ใช้วันที่ของรายการแรกสุดใน Group มาเทียบ
             valA = a.items[0]?.date || '';
             valB = b.items[0]?.date || '';
             // แปลง dd/MM/yyyy เป็น yyyyMMdd เพื่อ sort string
             const dateA = valA.split('/').reverse().join('');
             const dateB = valB.split('/').reverse().join('');
             return dateA.localeCompare(dateB) * direction;
          case 'desc':
             valA = a.items[0]?.desc || '';
             valB = b.items[0]?.desc || '';
             return valA.localeCompare(valB) * direction;
          default:
            return 0;
        }
      });
    }

    // 3. Flattening (แตกเป็นแถวเพื่อแสดงผล แต่ลำดับ Group ถูกจัดไว้แล้ว)
    const rows: FlatAllowanceRow[] = [];
    filtered.forEach((req) => {
      // (Optional) อยาก Sort Items ภายใน Group ด้วยไหม? ถ้าอยากเพิ่มตรงนี้ได้
      // req.items.sort(...) 

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

  // Table Config (ใช้ data ที่ sort แล้วจาก processedData เลย ไม่ต้องใช้ getSortedRowModel)
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
    // getSortedRowModel: undefined, // *สำคัญ* ปิดการ Sort อัตโนมัติของ Lib เพื่อให้ Group ไม่แตก
  }));

  ngOnInit() {}

  openModal() { this.isModalOpen = true; }
  closeModal() { this.isModalOpen = false; }
  onSearch() { this.allRequests.set([...this.allRequests()]); }

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