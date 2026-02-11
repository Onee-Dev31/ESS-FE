import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AllowanceFormComponent } from '../../components/features/allowance-form/allowance-form';
import { AllowanceService } from '../../services/allowance.service';
import { AllowanceRequest, AllowanceItem } from '../../interfaces/allowance.interface';
import { LoadingService } from '../../services/loading';
import { DateUtilityService } from '../../services/date-utility.service';
import { StatusUtil } from '../../utils/status.util';
import { createListingState, createListingComputeds, clearListingFilters, TableSortHelper } from '../../utils/listing.util';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { MedicalPolicyModalComponent } from '../../components/modals/medical-policy-modal/medical-policy-modal';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
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

import { StatusLabelPipe } from '../../pipes/status-label.pipe';

/** หน้าแสดงรายการคำขอเบี้ยเลี้ยง (Allowance) พร้อมระบบตารางข้อมูลและตัวกรอง */
@Component({
  selector: 'app-allowance',
  standalone: true,
  imports: [CommonModule, FormsModule, AllowanceFormComponent, StatusLabelPipe, PaginationComponent, PageHeaderComponent, MedicalPolicyModalComponent, EmptyStateComponent, SkeletonComponent],
  templateUrl: './allowance.html',
  styleUrl: './allowance.scss',
})
export class AllowanceComponent implements OnInit {
  private allowanceService = inject(AllowanceService);
  private dateUtil = inject(DateUtilityService);

  protected readonly Math = Math;

  isModalOpen = false;
  isPolicyModalOpen = signal<boolean>(false);
  selectedRequestId = '';

  allRequests = signal<AllowanceRequest[]>([]);
  sorting = signal<SortingState>([{ id: 'requestId', desc: true }]);

  listing = createListingState();

  processedData = computed(() => {
    const list = [...this.allRequests()];
    const search = this.listing.searchText().toLowerCase();
    const status = this.listing.filterStatus();
    const start = this.listing.filterStartDate();
    const end = this.listing.filterEndDate();

    let filtered = list.filter(r => {
      const matchSearch = !search || r.id.toLowerCase().includes(search) ||
        r.items.some(item => item.description.toLowerCase().includes(search));
      const matchStatus = !status || r.status === status;
      const matchStart = !start || r.createDate >= start;
      const matchEnd = !end || r.createDate <= end;
      return matchSearch && matchStatus && matchStart && matchEnd;
    });

    const sortState = this.sorting()[0];
    if (sortState) {
      const { id, desc } = sortState;
      const direction = desc ? -1 : 1;

      filtered.sort((requestA, requestB) => {
        let valueA: number | string, valueB: number | string;
        switch (id) {
          case 'requestId': return requestA.id.localeCompare(requestB.id) * direction;
          case 'createDate': return requestA.createDate.localeCompare(requestB.createDate) * direction;
          case 'status': return requestA.status.localeCompare(requestB.status) * direction;
          case 'amount':
            valueA = requestA.items.reduce((sum, i) => sum + i.amount, 0);
            valueB = requestB.items.reduce((sum, i) => sum + i.amount, 0);
            return (valueA - valueB) * direction;
          case 'hours':
            valueA = requestA.items.reduce((sum, i) => sum + i.hours, 0);
            valueB = requestB.items.reduce((sum, i) => sum + i.hours, 0);
            return (valueA - valueB) * direction;
          case 'date':
            valueA = requestA.items[0]?.date || '';
            valueB = requestB.items[0]?.date || '';
            return this.dateUtil.formatBEToISO(valueA).localeCompare(this.dateUtil.formatBEToISO(valueB)) * direction;
          case 'description':
            valueA = requestA.items[0]?.description || '';
            valueB = requestB.items[0]?.description || '';
            return valueA.localeCompare(valueB) * direction;
          default: return 0;
        }
      });
    }
    return filtered;
  });

  comps = createListingComputeds(this.processedData, this.listing);

  /** แปลงข้อมูลจากรูปแบบ Request (ที่มีหลายรายการย่อย) เป็นแถวตารางแบบแบน (Flat Rows) */
  displayedRows = computed(() => {
    const rows: FlatAllowanceRow[] = [];
    this.comps.paginatedData().forEach((request: AllowanceRequest) => {
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

  ngOnInit() {
    this.loadData();
  }

  private loadingService = inject(LoadingService);
  isLoading = this.loadingService.loading('allowance-list');

  loadData() {
    this.loadingService.start('allowance-list');
    this.allowanceService.getAllowanceRequests().subscribe(data => {
      this.allRequests.set(data);
      this.loadingService.stop('allowance-list');
    });
  }

  openModal() {
    this.allowanceService.generateNextAllowanceId().subscribe(nid => {
      this.selectedRequestId = nid;
      this.isModalOpen = true;
    });
  }

  editRequest(targetId: string) {
    this.selectedRequestId = targetId;
    this.isModalOpen = true;
  }

  deleteRequest(targetId: string) {
    if (confirm('ยืนยันการลบรายการเบิกเบี้ยเลี้ยงนี้?')) {
      this.allowanceService.deleteRequest(targetId).subscribe(() => {
        this.loadData();
      });
    }
  }

  closeModal() {
    this.isModalOpen = false;
    this.loadData();
  }

  clearFilters() {
    clearListingFilters(this.listing);
  }

  toggleSort(columnId: string) {
    TableSortHelper.toggleSort(this.table, columnId);
  }

  getSortIcon(columnId: string) {
    return TableSortHelper.getSortIcon(this.table, columnId);
  }

  trackByReqId(index: number, req: AllowanceRequest): string {
    return req.id;
  }

  trackByRowId(index: number, itemOrRow: AllowanceRequest | FlatAllowanceRow | import('@tanstack/angular-table').Row<FlatAllowanceRow>): string {
    const item = 'original' in itemOrRow ? itemOrRow.original : itemOrRow;
    const id = (item as FlatAllowanceRow).requestId || (item as AllowanceRequest).id || 'row';
    const date = (item as FlatAllowanceRow).date || '';
    return `${id}-${date}-${index}`;
  }

  getStatusClass(status: string): string {
    return StatusUtil.getStatusBadgeClass(status);
  }

  setPageSize(size: number) {
    this.listing.pageSize.set(size);
    this.listing.currentPage.set(0);
  }

  goToPage(page: number) {
    this.listing.currentPage.set(page);
  }

}
