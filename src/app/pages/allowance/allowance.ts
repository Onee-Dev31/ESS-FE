import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AllowanceFormComponent } from '../../components/features/allowance-form/allowance-form';
import { AllowanceApiService } from '../../services/allowance-api.service';
import { SwalService } from '../../services/swal.service';
import { AuthService } from '../../services/auth.service';
import {
  AllowanceRequest,
  AllowanceItem,
  MealAllowanceClaim,
} from '../../interfaces/allowance.interface';
import { LoadingService } from '../../services/loading';
import { DateUtilityService } from '../../services/date-utility.service';
import { StatusUtil } from '../../utils/status.util';
import {
  createListingState,
  clearListingFilters,
  TableSortHelper,
  createListingComputeds_v2,
} from '../../utils/listing.util';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { MedicalPolicyModalComponent } from '../../components/modals/medical-policy-modal/medical-policy-modal';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { combineLatest, debounce, timer, switchMap, catchError, of } from 'rxjs';
import { createAngularTable, getCoreRowModel, SortingState } from '@tanstack/angular-table';
import { StatusLabelPipe } from '../../pipes/status-label.pipe';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { en_US, NzI18nService } from 'ng-zorro-antd/i18n';
import dayjs from 'dayjs';

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
  imports: [
    CommonModule,
    FormsModule,
    AllowanceFormComponent,
    StatusLabelPipe,
    PaginationComponent,
    PageHeaderComponent,
    MedicalPolicyModalComponent,
    EmptyStateComponent,
    SkeletonComponent,
    NzSelectModule,
    NzInputModule,
    NzIconModule,
    NzDatePickerModule,
  ],
  templateUrl: './allowance.html',
  styleUrl: './allowance.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllowanceComponent implements OnInit {
  private allowanceApiService = inject(AllowanceApiService);
  private swalService = inject(SwalService);
  private authService = inject(AuthService);
  dateUtil = inject(DateUtilityService);
  private loadingService = inject(LoadingService);

  dateRange: Date[] | null = null;

  protected readonly Math = Math;

  isModalOpen = false;
  isPolicyModalOpen = signal<boolean>(false);
  selectedRequestId = '';
  selectedRequest: any = null;

  allRequests = signal<any[]>([]);
  listing = createListingState();
  comps = createListingComputeds_v2(this.allRequests, this.listing);
  totalCount = signal<number>(0);
  sorting = signal<SortingState>([{ id: 'requestId', desc: true }]);
  private reloadTrigger = signal(0);

  isLoading = this.loadingService.loading('allowance-list');

  constructor(private i18n: NzI18nService) {
    this.i18n.setLocale(en_US);
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    // this.loadingService.start('vehicle-list');

    let [start, end]: [any, any] = ['', ''];
    if (this.dateRange && this.dateRange.length === 2) {
      [start, end] = this.dateRange;
      // console.log('Selected date range:', dayjs(start).format("YYYY-MM-DD"), dayjs(end).format("YYYY-MM-DD"));
    }

    const param = {
      employee_code: this.authService.userData().CODEMPID,
      date_from: start ? dayjs(start).format('YYYY-MM-DD') : '',
      date_to: end ? dayjs(end).format('YYYY-MM-DD') : '',
      status: this.listing.filterStatus(),
      search: this.listing.searchText() || '',
      page_number: this.listing.currentPage() + 1 || 1,
      page_size: this.listing.pageSize(),
    };

    // console.log(param)

    this.allowanceApiService.getClaims(param).subscribe({
      next: (res) => {
        this.dataFromApi(res);
        // this.loadingService.stop('vehicle-list');
      },
      error: (error) => {
        // this.loadingService.stop('vehicle-list');
      },
    });
  }

  private dataFromApi(res: any) {
    const items = res.data ?? [];
    // console.log(res)
    this.allRequests.set(this.mapApiData(items));

    this.listing.totalItems.set(res.pagination.total ?? 0);
    this.listing.totalPages.set(res.pagination.totalPages ?? 1);
    this.listing.currentPage.set((res.pagination.page ?? 1) - 1);
  }

  private mapApiData(items: any[]): any[] {
    // console.log("items >> ", items)
    return items.map((claim: any) => ({
      id: claim.claimId,
      claimNo: claim.voucherNo,
      typeId: 0,
      createDate: claim.createdAt?.split('T')[0] ?? claim.claimDate,
      status: claim.status,
      amount: claim.totalAmount,
      items: (claim.details ?? []).map((d: any) => ({
        date: d.work_date?.split('T')[0] ?? '',
        timeIn: d.actual_checkin ?? '',
        timeOut: d.actual_checkout ?? '',
        description: d.description ?? '',
        hours: d.extra_hours ?? 0,
        amount: d.rate_amount ?? 0,
        selected: false,
      })),
      ...claim,
    }));
  }

  openModal(claimId?: string) {
    if (claimId) {
      const result = this.allRequests().find((item) => item.id === claimId);
      this.selectedRequest = result;
      // console.log("result: ", result)
    }
    this.isModalOpen = true;
  }

  editRequest(targetId: string) {
    this.openModal(targetId);
  }

  deleteRequest(targetId: string) {
    this.swalService.confirm('ยืนยันการลบ', 'ต้องการลบรายการเบิกเบี้ยเลี้ยงนี้?').then((result) => {
      if (result.isConfirmed) {
        this.allowanceApiService.deleteClaim(Number(targetId)).subscribe({
          next: () => {
            this.swalService.success('ลบรายการสำเร็จ');
            this.loadData();
          },
          error: () => this.swalService.error('เกิดข้อผิดพลาดในการลบรายการ'),
        });
      }
    });
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedRequest = '';
    this.loadData();
  }

  clearFilters() {
    clearListingFilters(this.listing);
    this.dateRange = null;
    this.loadData();
  }

  trackByReqId(_index: number, req: AllowanceRequest): string {
    return req.id;
  }

  trackByRowId(
    _index: number,
    itemOrRow:
      | AllowanceRequest
      | FlatAllowanceRow
      | import('@tanstack/angular-table').Row<FlatAllowanceRow>,
  ): string {
    const item = 'original' in itemOrRow ? itemOrRow.original : itemOrRow;
    const id = (item as FlatAllowanceRow).requestId || (item as AllowanceRequest).id || 'row';
    const date = (item as FlatAllowanceRow).date || '';
    return `${id}-${date}-${_index}`;
  }
  getStatusClass(status: string) {
    return StatusUtil.getStatusBadgeClaims(status.toLowerCase());
  }

  setPageSize(size: number) {
    this.listing.pageSize.set(size);
    this.listing.currentPage.set(0);
    this.loadData();
  }

  goToPage(page: number) {
    this.listing.currentPage.set(page);
    this.loadData();
  }
}
