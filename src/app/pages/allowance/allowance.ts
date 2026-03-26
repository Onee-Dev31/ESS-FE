import { Component, OnInit, signal, computed, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AllowanceFormComponent } from '../../components/features/allowance-form/allowance-form';
import { AllowanceService } from '../../services/allowance.service';
import { AllowanceApiService } from '../../services/allowance-api.service';
import { AuthService } from '../../services/auth.service';
import { AllowanceRequest, AllowanceItem, MealAllowanceClaim } from '../../interfaces/allowance.interface';
import { LoadingService } from '../../services/loading';
import { DateUtilityService } from '../../services/date-utility.service';
import { StatusUtil } from '../../utils/status.util';
import { createListingState, clearListingFilters, TableSortHelper } from '../../utils/listing.util';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { MedicalPolicyModalComponent } from '../../components/modals/medical-policy-modal/medical-policy-modal';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { combineLatest, debounce, timer, switchMap, catchError, of } from 'rxjs';
import {
  createAngularTable,
  getCoreRowModel,
  SortingState,
} from '@tanstack/angular-table';
import { StatusLabelPipe } from '../../pipes/status-label.pipe';

interface FlatAllowanceRow extends AllowanceItem {
  requestId: string;
  createDate: string;
  status: string;
  isFirstInGroup: boolean;
  groupLength: number;
}

/** หน้าแสดงรายการคำขอเบี้ยเลี้ยง (Allowance) พร้อมระบบตารางข้อมูลและตัวกรอง */
@Component({
  selector: 'app-allowance',
  standalone: true,
  imports: [CommonModule, FormsModule, AllowanceFormComponent, StatusLabelPipe, PaginationComponent, PageHeaderComponent, MedicalPolicyModalComponent, EmptyStateComponent, SkeletonComponent],
  templateUrl: './allowance.html',
  styleUrl: './allowance.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllowanceComponent implements OnInit {
  private allowanceApiService = inject(AllowanceApiService);
  private allowanceService = inject(AllowanceService);
  private authService = inject(AuthService);
  private dateUtil = inject(DateUtilityService);
  private loadingService = inject(LoadingService);
  private destroyRef = inject(DestroyRef);

  protected readonly Math = Math;

  isModalOpen = false;
  isPolicyModalOpen = signal<boolean>(false);
  selectedRequestId = '';

  allRequests = signal<AllowanceRequest[]>([]);
  totalCount = signal<number>(0);
  sorting = signal<SortingState>([{ id: 'requestId', desc: true }]);
  private reloadTrigger = signal(0);

  listing = createListingState();

  isLoading = this.loadingService.loading('allowance-list');

  /** Map API claim → AllowanceRequest shape used by the template */
  private mapClaim(claim: MealAllowanceClaim): AllowanceRequest {
    return {
      id: claim.voucherNo,
      typeId: 0,
      createDate: claim.createdAt?.split('T')[0] ?? claim.claimDate,
      status: claim.status,
      items: (claim.details ?? []).map(d => ({
        date: d.work_date?.split('T')[0] ?? '',
        timeIn: d.actual_checkin ?? '',
        timeOut: d.actual_checkout ?? '',
        description: d.description ?? '',
        hours: d.extra_hours ?? 0,
        amount: d.rate_amount ?? 0,
        selected: false,
      })),
    };
  }

  /** Client-side sort on the fetched page */
  processedData = computed(() => {
    const list = [...this.allRequests()];
    const sortState = this.sorting()[0];
    if (!sortState) return list;

    const { id, desc } = sortState;
    const direction = desc ? -1 : 1;

    list.sort((a, b) => {
      let va: number | string, vb: number | string;
      switch (id) {
        case 'requestId':  return a.id.localeCompare(b.id) * direction;
        case 'createDate': return a.createDate.localeCompare(b.createDate) * direction;
        case 'status':     return a.status.localeCompare(b.status) * direction;
        case 'amount':
          va = a.items.reduce((s, i) => s + i.amount, 0);
          vb = b.items.reduce((s, i) => s + i.amount, 0);
          return (va - vb) * direction;
        case 'hours':
          va = a.items.reduce((s, i) => s + i.hours, 0);
          vb = b.items.reduce((s, i) => s + i.hours, 0);
          return (va - vb) * direction;
        case 'date':
          va = a.items[0]?.date || '';
          vb = b.items[0]?.date || '';
          return this.dateUtil.formatBEToISO(va).localeCompare(this.dateUtil.formatBEToISO(vb)) * direction;
        case 'description':
          va = a.items[0]?.description || '';
          vb = b.items[0]?.description || '';
          return va.localeCompare(vb) * direction;
        default: return 0;
      }
    });
    return list;
  });

  /** แปลงข้อมูลจากรูปแบบ Request เป็นแถวตารางแบบแบน */
  displayedRows = computed(() => {
    const rows: FlatAllowanceRow[] = [];
    this.processedData().forEach((request: AllowanceRequest) => {
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

  constructor() {
    // Seed from cache immediately so the page feels instant on re-visit
    const cached = this.allowanceApiService.lastResponse();
    if (cached) {
      this.allRequests.set((cached.data ?? []).map(c => this.mapClaim(c)));
      this.totalCount.set(cached.pagination?.total ?? 0);
    }

    // Convert signals to observables and combine
    // Search text uses 400ms debounce, other filters fire immediately
    combineLatest({
      search:    toObservable(this.listing.searchText).pipe(debounce(v => timer(v ? 400 : 0))),
      status:    toObservable(this.listing.filterStatus),
      startDate: toObservable(this.listing.filterStartDate),
      endDate:   toObservable(this.listing.filterEndDate),
      page:      toObservable(this.listing.currentPage),
      pageSize:  toObservable(this.listing.pageSize),
      _reload:   toObservable(this.reloadTrigger),
    }).pipe(
      switchMap(({ search, status, startDate, endDate, page, pageSize }) => {
        const userData = this.authService.userData();
        this.loadingService.start('allowance-list');
        return this.allowanceApiService.getClaims({
          employee_code: userData?.CODEMPID ?? '',
          date_from: startDate || undefined,
          date_to: endDate || undefined,
          status: status || undefined,
          search: search || undefined,
          page_number: page + 1,
          page_size: pageSize,
        }).pipe(
          catchError(() => of({ success: false, data: [], pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0, hasNext: false, hasPrevious: false } }))
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(res => {
      this.allRequests.set((res.data ?? []).map(c => this.mapClaim(c)));
      this.totalCount.set(res.pagination?.total ?? 0);
      this.loadingService.stop('allowance-list');
    });
  }

  ngOnInit() {}

  loadData() {
    this.listing.currentPage.set(0);
    this.reloadTrigger.update(v => v + 1);
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

  trackByReqId(_index: number, req: AllowanceRequest): string {
    return req.id;
  }

  trackByRowId(_index: number, itemOrRow: AllowanceRequest | FlatAllowanceRow | import('@tanstack/angular-table').Row<FlatAllowanceRow>): string {
    const item = 'original' in itemOrRow ? itemOrRow.original : itemOrRow;
    const id = (item as FlatAllowanceRow).requestId || (item as AllowanceRequest).id || 'row';
    const date = (item as FlatAllowanceRow).date || '';
    return `${id}-${date}-${_index}`;
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
