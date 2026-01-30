import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AllowanceFormComponent } from '../../components/features/allowance-form/allowance-form';
import { AllowanceService } from '../../services/allowance.service';
import { AllowanceRequest, AllowanceItem } from '../../interfaces/allowance.interface';
import { AlertService } from '../../services/alert.service';
import { VehicleService } from '../../services/vehicle.service';
import { DateUtilityService } from '../../services/date-utility.service';
import {
  createAngularTable,
  getCoreRowModel,
  getPaginationRowModel,
  SortingState,
} from '@tanstack/angular-table';

interface FlatAllowanceRow extends AllowanceItem {
  requestId: string;
  createDate: string;
  status: string;
  isFirstInGroup: boolean;
  groupLength: number;
}

import { StatusLabelPipe } from '../../pipes/status-label.pipe';

@Component({
  selector: 'app-allowance',
  standalone: true,
  imports: [CommonModule, FormsModule, AllowanceFormComponent, StatusLabelPipe],
  templateUrl: './allowance.html',
  styleUrl: './allowance.scss',
})
export class AllowanceComponent implements OnInit {
  private allowanceService = inject(AllowanceService);
  private alertService = inject(AlertService);
  private vehicleService = inject(VehicleService);
  private dateUtil = inject(DateUtilityService);
  private router = inject(Router);

  // กลับหน้า Dashboard
  goBack() {
    this.router.navigate(['/dashboard']);
  }
  protected readonly Math = Math;

  isModalOpen = false;
  selectedRequestId = '';
  filterStartDate = signal<string>('');
  filterEndDate = signal<string>('');
  filterStatus = signal<string>('');
  searchText = signal<string>('');


  allRequests = signal<AllowanceRequest[]>([]);

  sorting = signal<SortingState>([{ id: 'requestId', desc: true }]);


  currentPage = signal<number>(0);
  pageSize = signal<number>(10);


  // ประมวลผลและกรองข้อมูลเบี้ยเลี้ยงทั้งหมด
  processedData = computed(() => {
    let filtered = [...this.allRequests()];


    if (this.filterStatus()) {
      filtered = filtered.filter((r) => r.status === this.filterStatus());
    }

    if (this.filterStartDate()) {
      filtered = filtered.filter((r) => r.createDate >= this.filterStartDate());
    }

    if (this.filterEndDate()) {
      filtered = filtered.filter((r) => r.createDate <= this.filterEndDate());
    }

    if (this.searchText()) {
      const search = this.searchText().toLowerCase();
      filtered = filtered.filter((r) =>
        r.id.toLowerCase().includes(search) || // Filter by ID
        r.items.some(item => item.description.toLowerCase().includes(search)) // Filter by Item Description
      );
    }


    const sortState = this.sorting()[0];
    if (sortState) {
      const { id, desc } = sortState;
      const direction = desc ? -1 : 1;

      filtered.sort((requestA, requestB) => {
        let valueA: any, valueB: any;

        switch (id) {
          case 'requestId':
            return requestA.id.localeCompare(requestB.id) * direction;
          case 'createDate':
            return requestA.createDate.localeCompare(requestB.createDate) * direction;
          case 'status':
            return requestA.status.localeCompare(requestB.status) * direction;
          case 'amount':
            valueA = requestA.items.reduce((sum: number, item: AllowanceItem) => sum + item.amount, 0);
            valueB = requestB.items.reduce((sum: number, item: AllowanceItem) => sum + item.amount, 0);
            return (valueA - valueB) * direction;
          case 'hours':
            valueA = requestA.items.reduce((sum: number, item: AllowanceItem) => sum + item.hours, 0);
            valueB = requestB.items.reduce((sum: number, item: AllowanceItem) => sum + item.hours, 0);
            return (valueA - valueB) * direction;
          case 'date':
            valueA = requestA.items[0]?.date || '';
            valueB = requestB.items[0]?.date || '';
            // Convert BE to ISO for proper comparison
            const isoA = this.dateUtil.formatBEToISO(valueA);
            const isoB = this.dateUtil.formatBEToISO(valueB);
            return isoA.localeCompare(isoB) * direction;
          case 'description':
            valueA = requestA.items[0]?.description || '';
            valueB = requestB.items[0]?.description || '';
            return valueA.localeCompare(valueB) * direction;
          default:
            return 0;
        }
      });
    }

    return filtered;
  });

  // ข้อมูลคำขอที่แบ่งตามหน้า
  paginatedRequests = computed(() => {
    const filtered = this.processedData();
    const start = this.currentPage() * this.pageSize();
    const end = start + this.pageSize();
    return filtered.slice(start, end);
  });

  // แปลงข้อมูลเป็นรายการแถวเพื่อแสดงในตาราง (รองรับ Grouping)
  displayedRows = computed(() => {
    const rows: FlatAllowanceRow[] = [];
    this.paginatedRequests().forEach((request: AllowanceRequest) => {
      request.items.forEach((item: AllowanceItem, index: number) => {
        rows.push({
          ...item,
          requestId: request.id,
          createDate: request.createDate,
          status: request.status,
          isFirstInGroup: index === 0,
          groupLength: request.items.length,
        });
      });
    });
    return rows;
  });


  // คำนวณจำนวนรายการและหน้าทั้งหมด
  totalRequests = computed(() => this.processedData().length);
  totalPages = computed(() => Math.ceil(this.totalRequests() / this.pageSize()));

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

  // ตั้งค่าขนาดหน้า
  setPageSize(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(0);
  }

  // ไปหน้าถัดไป
  nextPage() {
    if (this.canNextPage()) {
      this.currentPage.update(p => p + 1);
    }
  }

  // ย้อนกลับหน้าก่อนหน้า
  previousPage() {
    if (this.canPreviousPage()) {
      this.currentPage.update(p => p - 1);
    }
  }

  // ไปยังหน้าที่ระบุ
  goToPage(page: number) {
    this.currentPage.set(Math.max(0, Math.min(page, this.totalPages() - 1)));
  }

  canNextPage() {
    return this.currentPage() < this.totalPages() - 1;
  }

  canPreviousPage() {
    return this.currentPage() > 0;
  }

  ngOnInit() {
    this.loadData();
  }

  // โหลดข้อมูลจาก Service
  loadData() {
    this.allowanceService.getAllowanceRequests().subscribe(data => {
      this.allRequests.set(data);
    });
  }

  // เปิด Modal เพิ่ม/แก้ไขคำขอ
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

  // ปิด Modal และรีเฟรชข้อมูล
  closeModal() {
    this.isModalOpen = false;
    this.loadData();
  }

  // ล้างตัวกรอง
  clearFilters() {
    this.filterStartDate.set('');
    this.filterEndDate.set('');
    this.filterStatus.set('');
    this.searchText.set('');
  }

  // สลับการเรียงลำดับคอลัมน์
  toggleSort(columnId: string) {
    const column = this.table.getColumn(columnId);
    if (column) column.toggleSorting(column.getIsSorted() === 'asc');
  }

  // ดึงไอคอนแสดงการเรียงลำดับ
  getSortIcon(columnId: string) {
    const isSorted = this.table.getColumn(columnId)?.getIsSorted();
    return {
      'fa-sort-amount-up': isSorted === 'asc',
      'fa-sort-amount-down-alt': isSorted === 'desc',
      'fa-sort': !isSorted,
      'text-muted': !isSorted,
    };
  }

  // ลบรายการคำขอ
  deleteRequest(id: string) {
    if (confirm('ยืนยันการลบรายการเบิกเลขที่ ' + id)) {
      this.allowanceService.deleteAllowanceRequest(id).subscribe(() => {
        this.alertService.showSuccess('ลบรายการเบิกเรียบร้อยแล้ว');
        this.loadData();
      });
    }
  }

  trackByReqId(index: number, req: AllowanceRequest): string {
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