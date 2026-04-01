import { Component, OnInit, signal, computed, inject, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MedicalClaim } from '../../interfaces/medical.interface';
import { MedicalApiService } from '../../services/medical-api.service';
import { AuthService } from '../../services/auth.service';
import { MedicalPolicyModalComponent } from '../../components/modals/medical-policy-modal/medical-policy-modal';
import { MedicalexpensesForm } from '../../components/features/medicalexpenses-form/medicalexpenses-form';
import { FilePreviewModalComponent } from '../../components/modals/file-preview-modal/file-preview-modal';
import { LoadingService } from '../../services/loading';
import { ErrorService } from '../../services/error';
import { StatusUtil } from '../../utils/status.util';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { createListingState, TableSortHelper } from '../../utils/listing.util';
import {
  createAngularTable,
  getCoreRowModel,
  SortingState,
} from '@tanstack/angular-table';
import dayjs from 'dayjs';
import { MONTHS_TH } from '../../constants/date.constant';
import { StatusLabelPipe } from '../../pipes/status-label.pipe';
import { DateUtilityService } from '../../services/date-utility.service';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { en_US, NzI18nService } from 'ng-zorro-antd/i18n';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { FileConverterService } from '../../services/file-converter';
/** หน้าแสดงรายการเบิกค่ารักษาพยาบาล */
@Component({
  selector: 'app-medicalexpenses',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MedicalexpensesForm,
    MedicalPolicyModalComponent,
    StatusLabelPipe,
    FilePreviewModalComponent,
    PageHeaderComponent,
    SkeletonComponent,
    EmptyStateComponent,
    NzDatePickerModule,
    NzInputModule,
    NzIconModule
  ],
  templateUrl: './medicalexpenses.html',
  styleUrl: './medicalexpenses.scss',
})
export class MedicalexpensesComponent implements OnInit {
  private medicalApiService = inject(MedicalApiService);
  private authService = inject(AuthService);
  private loadingService = inject(LoadingService);
  private errorService = inject(ErrorService);
  private fileConverter = inject(FileConverterService);
  dateUtil = inject(DateUtilityService);

  isLoading = this.loadingService.loading('medical-list');
  isRefreshing = signal<boolean>(false);
  private initialized = false;

  listing = createListingState();

  // fromMonth = signal<number>(0);
  // fromYear = signal<string>((dayjs().year() - 1).toString());
  // toMonth = signal<number>(11);
  // toYear = signal<string>(dayjs().year().toString());
  date: Date[] | null = null;

  statusOptions = signal<{ value: string; label: string }[]>([]);
  months = MONTHS_TH;

  allClaims = signal<MedicalClaim[]>([]);
  sorting = signal<SortingState>([{ id: 'claimId', desc: true }]);

  isModalOpen = signal<boolean>(false);
  isPolicyModalOpen = signal<boolean>(false);
  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<any[]>([]);

  sortedClaims = computed(() => {
    let rows = [...this.allClaims()];
    const sortState = this.sorting()[0];
    if (sortState) {
      const { id, desc } = sortState;
      const direction = desc ? -1 : 1;
      rows.sort((a, b) => {
        const valA = (a as any)[id] ?? '';
        const valB = (b as any)[id] ?? '';
        if (typeof valA === 'string' && typeof valB === 'string') {
          return valA.localeCompare(valB) * direction;
        }
        return (((valA as unknown as number) || 0) - ((valB as unknown as number) || 0)) * direction;
      });
    }
    return rows;
  });

  paginatedClaims = computed(() => {
    const start = this.listing.currentPage() * this.listing.pageSize();
    return this.sortedClaims().slice(start, start + this.listing.pageSize());
  });

  totalItems = computed(() => this.allClaims().length);
  totalAmount = computed(() => this.allClaims().reduce((s, c) => s + c.requestedAmount, 0));
  pendingCount = computed(() => this.allClaims().filter(c => ['NEW', 'PENDING_APPROVAL', 'WAITING_CHECK'].includes(c.status)).length);
  approvedCount = computed(() => this.allClaims().filter(c => c.status === 'APPROVED').length);

  table = createAngularTable(() => ({
    data: this.paginatedClaims(),
    columns: [
      { accessorKey: 'claimId', header: 'เลขที่เอกสาร' },
      { accessorKey: 'claimDate', header: 'วันที่ขอเบิก' },
      { accessorKey: 'expenseTypeName', header: 'ประเภทวงเงิน' },
      { accessorKey: 'diseaseName', header: 'ประเภทโรค' },
      { accessorKey: 'hospitalName', header: 'สถานพยาบาล' },
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

  setPageSize(size: number) {
    this.listing.pageSize.set(size);
    this.listing.currentPage.set(0);
  }

  goToPage(page: number) {
    this.listing.currentPage.set(page);
  }

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private i18n: NzI18nService,
  ) {
    this.i18n.setLocale(en_US);
  }

  ngOnInit() {
    this.medicalApiService.getStatuses().subscribe({
      next: (res) => {
        this.statusOptions.set(
          res.data.filter(s => s.isActive).map(s => ({ value: s.statusCode, label: s.statusName }))
        );
      }
    });
    this.loadData();
  }

  loadData() {
    const employeeCode = this.authService.userData()?.CODEMPID ?? '';
    const status = this.listing.filterStatus() || undefined;
    const keyword = this.listing.searchText().trim() || undefined;

    if (!this.initialized) {
      this.loadingService.start('medical-list');
    } else {
      this.isRefreshing.set(true);
    }

    let datePayload = {};

    if (this.date && this.date.length === 2) {
      const [start, end] = this.date;

      datePayload = {
        from_month: start.getMonth() + 1,
        from_year: start.getFullYear(),
        to_month: end.getMonth() + 1,
        to_year: end.getFullYear(),
      };
    }

    const payload = {
      employee_code: employeeCode,
      ...datePayload,
      status,
      keyword,
    }

    // console.log(payload)

    this.medicalApiService.getClaims(payload).subscribe({
      next: (res) => {
        this.allClaims.set(res.data);
        this.listing.currentPage.set(0);
        this.loadingService.stop('medical-list');
        this.isRefreshing.set(false);
        this.initialized = true;
      },
      error: (error) => {
        this.loadingService.stop('medical-list');
        this.isRefreshing.set(false);
        this.errorService.handle(error, { component: 'MedicalExpenses', action: 'load-data' });
      }
    });
  }

  openModal() {
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.loadData();
  }

  clearFilters() {
    clearListingFiltersLocal(this.listing);
    this.date = null
    // this.fromMonth.set(0);
    // this.fromYear.set((dayjs().year() - 1).toString());
    // this.toMonth.set(11);
    // this.toYear.set(dayjs().year().toString());
    this.loadData();
  }

  toggleSort(columnId: string) {
    TableSortHelper.toggleSort(this.table, columnId);
  }

  getSortIcon(columnId: string) {
    return TableSortHelper.getSortIcon(this.table, columnId);
  }

  openPreview(claim: MedicalClaim) {
    if (!claim.attachments?.length) return;
    this.previewFiles.set(this.fileConverter.buildPreviewFiles(claim.attachments));
    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }

  getStatusClass(status: string) {
    return StatusUtil.getStatusBadgeClaims(status);
  }

  trackById(_: number, claim: MedicalClaim): number {
    return claim.claimId;
  }
}

function clearListingFiltersLocal(listing: ReturnType<typeof createListingState>) {
  listing.filterStatus.set('');
  listing.searchText.set('');
  listing.currentPage.set(0);
}
