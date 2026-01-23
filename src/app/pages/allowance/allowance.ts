import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AllowanceFormComponent } from '../../components/features/allowance-form/allowance-form';
import { AllowanceService, AllowanceRequest, AllowanceItem } from '../../services/allowance.service';
import { AlertService } from '../../services/alert.service'; // เพิ่ม AlertService
import {
  createAngularTable,
  getCoreRowModel,
  getPaginationRowModel,
  SortingState,
} from '@tanstack/angular-table';

/**
 * โครงสร้างข้อมูลสำหรับแถวในตารางเบี้ยเลี้ยง (แบบเรียบ)
 */
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
  private allowanceService = inject(AllowanceService);
  private alertService = inject(AlertService); // ฉีด AlertService
  private router = inject(Router);

  /**
   * กลับหน้า Dashboard
   */
  goBack() {
    this.router.navigate(['/dashboard']);
  }
  protected readonly Math = Math;

  isModalOpen = false;
  selectedRequestId = ''; // รหัสคำขอที่เลือกเพื่อส่งให้ Modal
  filterStartDate = signal<string>('');
  filterEndDate = signal<string>('');
  filterStatus = signal<string>('');

  // ข้อมูลดิบจาก Service
  allRequests = signal<AllowanceRequest[]>([]);

  sorting = signal<SortingState>([{ id: 'requestId', desc: true }]);

  // สถานะ Pagination
  currentPage = signal<number>(0);
  pageSize = signal<number>(10);

  /**
   * ประมวลผลและกรองข้อมูลเบี้ยเลี้ยงทั้งหมด
   */
  processedData = computed(() => {
    let filtered = [...this.allRequests()];

    // กรองตามสถานะ
    if (this.filterStatus()) {
      filtered = filtered.filter((r) => {
        return r.status === this.filterStatus();
      });
    }

    // การเรียงลำดับข้อมูลเชิงลึก
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

    return filtered;
  });

  /**
   * ข้อมูลคำขอที่แบ่งตามหน้า
   */
  paginatedRequests = computed(() => {
    const filtered = this.processedData();
    const start = this.currentPage() * this.pageSize();
    const end = start + this.pageSize();
    return filtered.slice(start, end);
  });

  /**
   * แปลงข้อมูลคำขอ (Request) เป็นรายการแถว (Row) เพื่อแสดงผลแบบ Grouping ในตาราง
   */
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

  // คำนวณจำนวนรายการและหน้าทั้งหมด
  totalRequests = computed(() => this.processedData().length);
  totalPages = computed(() => Math.ceil(this.totalRequests() / this.pageSize()));

  /**
   * ตั้งค่าตารางเบี้ยเลี้ยง
   */
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

  /**
   * ตั้งค่าขนาดของหน้า (Page Size)
   */
  setPageSize(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(0);
  }

  /**
   * ไปยังหน้าถัดไป
   */
  nextPage() {
    if (this.canNextPage()) {
      this.currentPage.update(p => p + 1);
    }
  }

  /**
   * ย้อนกลับหน้าก่อนหน้า
   */
  previousPage() {
    if (this.canPreviousPage()) {
      this.currentPage.update(p => p - 1);
    }
  }

  /**
   * ไปยังหน้าที่ระบุ
   */
  goToPage(page: number) {
    this.currentPage.set(Math.max(0, Math.min(page, this.totalPages() - 1)));
  }

  /**
   * ตรวจสอบว่าสามารถไปหน้าถัดไปได้หรือไม่
   */
  canNextPage() {
    return this.currentPage() < this.totalPages() - 1;
  }

  /**
   * ตรวจสอบว่าสามารถถอยหลังได้หรือไม่
   */
  canPreviousPage() {
    return this.currentPage() > 0;
  }

  ngOnInit() {
    this.loadData();
  }

  /**
   * โหลดข้อมูลจาก Service
   */
  loadData() {
    this.allowanceService.getAllowanceRequests().subscribe(data => {
      this.allRequests.set(data);
    });
  }

  /**
   * เปิด Modal สำหรับจัดการคำขอ
   */
  openModal(id: string = '') {
    if (id === '') {
      this.allowanceService.generateNextAllowanceId().subscribe(nid => {
        this.selectedRequestId = nid;
        this.isModalOpen = true;
      });
    } else {
      this.selectedRequestId = id;
      this.isModalOpen = true;
    }
  }

  /**
   * ปิด Modal และรีเฟรชข้อมูล
   */
  closeModal() {
    this.isModalOpen = false;
    this.loadData();
  }

  /**
   * ล้างตัวกรอง
   */
  clearFilters() {
    this.filterStartDate.set('');
    this.filterEndDate.set('');
    this.filterStatus.set('');
  }

  /**
   * จัดการการเรียงลำดับคอลัมน์
   */
  toggleSort(columnId: string) {
    const column = this.table.getColumn(columnId);
    if (column) column.toggleSorting(column.getIsSorted() === 'asc');
  }

  /**
   * คืนค่าคลาส CSS ของไอคอนเรียงลำดับ
   */
  getSortIcon(columnId: string) {
    const isSorted = this.table.getColumn(columnId)?.getIsSorted();
    return {
      'fa-sort-amount-up': isSorted === 'asc',
      'fa-sort-amount-down-alt': isSorted === 'desc',
      'fa-sort': !isSorted,
      'text-muted': !isSorted,
    };
  }

  /**
   * trackBy สำหรับรายการในตาราง
   */
  trackByRowId(index: number, row: any): string {
    const original = row.original || row;
    return `${original.requestId}-${original.date}-${index}`;
  }

  /**
   * ระบุ CSS Class ตามสถานะ (เพื่อใช้ในการแสดงสี Badge)
   */
  public getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      'คำขอใหม่': 'status-new',
      'ตรวจสอบแล้ว': 'status-verified',
      'อยู่ระหว่างการอนุมัติ': 'status-pending',
      'อนุมัติแล้ว': 'status-success',
    };
    return statusMap[status] || '';
  }
}