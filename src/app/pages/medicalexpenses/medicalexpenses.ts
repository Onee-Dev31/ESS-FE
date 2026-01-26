import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MedicalexpensesService, MedicalRequest, MedicalItem } from '../../services/medicalexpenses.service';
import { VehicleService } from '../../services/vehicle.service';
import { MedicalPolicyModalComponent } from '../../components/modals/medical-policy-modal/medical-policy-modal';
import { MedicalexpensesForm } from '../../components/features/medicalexpenses-form/medicalexpenses-form';
import {
  createAngularTable,
  getCoreRowModel,
  SortingState,
} from '@tanstack/angular-table';

/**
 * แถวข้อมูลค่ารักษาพยาบาลแบบเรียบ
 */
interface FlatMedicalRow extends MedicalItem {
  requestId: string;
  createDate: string;
  status: string;
}

@Component({
  selector: 'app-medicalexpenses',
  standalone: true,
  imports: [CommonModule, FormsModule, MedicalPolicyModalComponent, MedicalexpensesForm],
  templateUrl: './medicalexpenses.html',
  styleUrl: './medicalexpenses.scss',
})
export class MedicalexpensesComponent implements OnInit {
  private medicalService = inject(MedicalexpensesService);
  private vehicleService = inject(VehicleService);
  private router = inject(Router);

  /**
   * กลับหน้า Dashboard
   */
  goBack() {
    this.router.navigate(['/dashboard']);
  }
  protected readonly Math = Math;

  isModalOpen = signal<boolean>(false);
  selectedRequestId = signal<string>('');
  filterStatus = signal<string>(''); // เพิ่ม filter สถานะ
  isPolicyModalOpen = signal<boolean>(false);
  isFilterVisible = signal<boolean>(false); // เพิ่มตัวแปรสำหรับเปิด-ปิด Filter

  fromMonth = signal<number>(0);
  fromYear = signal<string>((new Date().getFullYear() - 1).toString()); // ปรับให้เริ่มตั้งแต่ปีที่แล้วเพื่อให้เห็นข้อมูล Mock ครบ
  toMonth = signal<number>(11);
  toYear = signal<string>((new Date().getFullYear()).toString());

  months = [
    { label: 'มกราคม', value: 0 }, { label: 'กุมภาพันธ์', value: 1 }, { label: 'มีนาคม', value: 2 },
    { label: 'เมษายน', value: 3 }, { label: 'พฤษภาคม', value: 4 }, { label: 'มิถุนายน', value: 5 },
    { label: 'กรกฎาคม', value: 6 }, { label: 'สิงหาคม', value: 7 }, { label: 'กันยายน', value: 8 },
    { label: 'ตุลาคม', value: 9 }, { label: 'พฤศจิกายน', value: 10 }, { label: 'ธันวาคม', value: 11 }
  ];

  // ข้อมูลจาก Service
  allRequests = signal<MedicalRequest[]>([]);
  sorting = signal<SortingState>([{ id: 'requestId', desc: true }]);

  // สถานะ Pagination
  currentPage = signal<number>(0);
  pageSize = signal<number>(10);

  /**
   * ประมวลผลและกรองข้อมูล
   */
  processedData = computed(() => {
    let data = [...this.allRequests()];

    // กรองตามสถานะ
    if (this.filterStatus()) {
      data = data.filter(r => r.status === this.filterStatus());
    }

    // กรองตามช่วงวันที่ (Month/Year)
    const fromMonth = this.fromMonth();
    const fromYear = parseInt(this.fromYear());
    const toMonth = this.toMonth();
    const toYear = parseInt(this.toYear());

    if (!isNaN(fromYear) && !isNaN(toYear)) {
      data = data.filter(r => {
        const reqDate = new Date(r.createDate);
        const reqMonth = reqDate.getMonth();
        const reqYear = reqDate.getFullYear();

        const startVal = fromYear * 100 + fromMonth;
        const endVal = toYear * 100 + toMonth;
        const currentVal = reqYear * 100 + reqMonth;

        return currentVal >= startVal && currentVal <= endVal;
      });
    }

    return data;
  });

  /**
   * แปลงข้อมูล Request เป็นรายการแถว (Row)
   */
  flattenedRows = computed(() => {
    const rows: FlatMedicalRow[] = [];
    this.processedData().forEach(req => {
      req.items.forEach(item => {
        rows.push({
          ...item,
          requestId: req.id,
          createDate: req.createDate,
          status: req.status
        });
      });
    });
    return rows;
  });

  /**
   * เรียงลำดับข้อมูลที่ Flatten แล้ว
   */
  sortedRows = computed(() => {
    let rows = [...this.flattenedRows()];
    const sortState = this.sorting()[0];
    if (sortState) {
      const fieldId = sortState.id;
      const desc = sortState.desc;
      const direction = desc ? -1 : 1;
      rows.sort((a: FlatMedicalRow, b: FlatMedicalRow) => {
        const valA = (a as any)[fieldId] || '';
        const valB = (b as any)[fieldId] || '';
        if (fieldId === 'requestId') return valA.localeCompare(valB) * direction;
        if (typeof valA === 'string') return valA.localeCompare(valB) * direction;
        return (valA - valB) * direction;
      });
    }
    return rows;
  });

  /**
   * ข้อมูลสำหรับแสดงผลในหน้าปัจจุบัน
   */
  paginatedRows = computed(() => {
    const start = this.currentPage() * this.pageSize();
    const end = start + this.pageSize();
    return this.sortedRows().slice(start, end);
  });

  // สถิติรวม
  totalRequests = computed(() => this.sortedRows().length);
  totalPages = computed(() => Math.ceil(this.totalRequests() / this.pageSize()));

  /**
   * ตั้งค่า TanStack Table
   */
  table = createAngularTable(() => ({
    data: this.paginatedRows(),
    columns: [
      { accessorKey: 'requestId', header: 'เลขที่เอกสาร' },
      { accessorKey: 'requestDate', header: 'วันที่ขอเบิก' },
      { accessorKey: 'limitType', header: 'ประเภทวงเงิน' },
      { accessorKey: 'diseaseType', header: 'ประเภทโรค' },
      { accessorKey: 'hospital', header: 'สถานพยาบาล' },
      { accessorKey: 'treatmentDateFrom', header: 'ตั้งแต่' },
      { accessorKey: 'treatmentDateTo', header: 'ถึง' },
      { accessorKey: 'requestedAmount', header: 'จำนวนเงินที่ขอเบิก' },
      { accessorKey: 'approvedAmount', header: 'จำนวนเงินที่เบิกได้' },
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

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.medicalService.getMedicalRequests().subscribe(data => {
      this.allRequests.set(data);
    });
  }

  openModal(targetId: string = '') {
    if (targetId === '') {
      this.medicalService.generateNextMedicalId().subscribe((nid: string) => {
        this.selectedRequestId.set(nid);
        this.isModalOpen.set(true);
      });
    } else {
      this.selectedRequestId.set(targetId);
      this.isModalOpen.set(true);
    }
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.loadData();
  }

  /**
   * ล้างตัวกรอง
   */
  clearFilters() {
    this.filterStatus.set('');
    this.fromMonth.set(0);
    this.fromYear.set((new Date().getFullYear() - 1).toString());
    this.toMonth.set(11);
    this.toYear.set((new Date().getFullYear()).toString());
  }

  toggleFilter() {
    this.isFilterVisible.update(v => !v);
  }

  /**
   * สลับการเรียงลำดับคอลัมน์
   */
  toggleSort(columnId: string) {
    const column = this.table.getColumn(columnId);
    if (column) column.toggleSorting(column.getIsSorted() === 'asc');
  }

  /**
   * คืนค่าคลาสไอคอนเรียงลำดับ
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
   * Pagination: ตั้งค่าขนาดหน้า
   */
  setPageSize(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(0);
  }

  /**
   * Pagination: ไปหน้าถัดไป
   */
  nextPage() { if (this.canNextPage()) this.currentPage.update(p => p + 1); }

  /**
   * Pagination: ถอยกลับ
   */
  previousPage() { if (this.canPreviousPage()) this.currentPage.update(p => p - 1); }

  /**
   * Pagination: ไปหน้าที่ระบุ
   */
  goToPage(page: number) { this.currentPage.set(Math.max(0, Math.min(page, this.totalPages() - 1))); }

  /**
   * ตรวจสอบว่าไปหน้าถัดไปได้หรือไม่
   */
  canNextPage() { return this.currentPage() < this.totalPages() - 1; }

  /**
   * ตรวจสอบว่าถอยได้หรือไม่
   */
  canPreviousPage() { return this.currentPage() > 0; }

  /**
   * trackBy สำหรับรายการ
   */
  trackByRowId(index: number, row: any): string {
    const original = (row as any).original || row;
    return `${original.requestId || 'new'}-${index}`;
  }

  /**
   * คืนค่า CSS Class สำหรับ Status Badge
   */
  getStatusClass(status: string): string {
    return this.vehicleService.getStatusBadgeClass(status);
  }
}
