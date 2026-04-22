import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransportService, VehicleRequest } from '../../services/transport.service';
import { LoadingService } from '../../services/loading';
import { ToastService } from '../../services/toast';
import { DialogService } from '../../services/dialog';
import { VehicleFormComponent } from '../../components/features/vehicle-form/vehicle-form';
import { StatusUtil } from '../../utils/status.util';
import {
  createListingState,
  clearListingFilters,
  createListingComputeds_v2,
} from '../../utils/listing.util';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { StatusLabelPipe } from '../../pipes/status-label.pipe';
import { VehicleService } from '../../services/vehicle.service';
import { SwalService } from '../../services/swal.service';
import { AuthService } from '../../services/auth.service';
import { DateUtilityService } from '../../services/date-utility.service';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { en_US, NzI18nService } from 'ng-zorro-antd/i18n';
import dayjs from 'dayjs';
import { NzSelectModule } from 'ng-zorro-antd/select';

/** หน้าแสดงรายการคำขอเบี้ยเลี้ยงค่ารถ (Vehicle Allowance) */
@Component({
  selector: 'app-vehicle',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    VehicleFormComponent,
    StatusLabelPipe,
    PaginationComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    SkeletonComponent,
    NzInputModule,
    NzIconModule,
    NzDatePickerModule,
    NzSelectModule,
  ],
  templateUrl: './vehicle.html',
  styleUrl: './vehicle.scss',
})
export class VehicleComponent implements OnInit {
  private transportService = inject(TransportService);
  private vehicleService = inject(VehicleService);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);
  private authservice = inject(AuthService);
  dateUtil = inject(DateUtilityService);

  private swalService = inject(SwalService);

  dateRange: Date[] | null = null;

  isModalOpen = false;
  selectedRequestId = '';
  selectedRequest: any = null;

  allRequests = signal<any[]>([]);
  listing = createListingState();
  comps = createListingComputeds_v2(this.allRequests, this.listing);

  hasActiveFilters = computed(
    () =>
      !!this.listing.searchText() ||
      !!this.listing.filterStatus() ||
      !!this.listing.filterStartDate() ||
      !!this.listing.filterEndDate(),
  );

  emptyTitle = computed(() =>
    this.hasActiveFilters() ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีรายการเบิก',
  );
  emptyDescription = computed(() =>
    this.hasActiveFilters()
      ? 'ลองเปลี่ยนเงื่อนไขการค้นหาหรือล้างตัวกรอง'
      : 'กดปุ่ม "สร้างรายการเบิก" เพื่อเริ่มต้นเบิกค่าพาหนะ',
  );
  emptyIcon = computed(() => (this.hasActiveFilters() ? 'fas fa-search' : 'fas fa-car'));

  ngOnInit() {
    this.loadData();
  }

  constructor(private i18n: NzI18nService) {
    this.i18n.setLocale(en_US);
  }

  private loadingService = inject(LoadingService);
  isLoading = this.loadingService.loading('vehicle-list');

  loadData() {
    // this.loadingService.start('vehicle-list');

    let [start, end]: [any, any] = ['', ''];
    if (this.dateRange && this.dateRange.length === 2) {
      [start, end] = this.dateRange;
      // console.log('Selected date range:', dayjs(start).format("YYYY-MM-DD"), dayjs(end).format("YYYY-MM-DD"));
    }

    const param = {
      page: this.listing.currentPage() + 1 || 1,
      pageSize: this.listing.pageSize(),
      empCode: this.authservice.userData().CODEMPID,
      searchText: this.listing.searchText() || '',
      claimStatus: this.listing.filterStatus(),
      dateFrom: start ? dayjs(start).format('YYYY-MM-DD') : '',
      dateTo: end ? dayjs(end).format('YYYY-MM-DD') : '',
    };

    // console.log(param)

    this.vehicleService.getVehicleClaimByEmpcode(param).subscribe({
      next: (res) => {
        // console.log(res)
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
    // console.log(items)
    this.allRequests.set(this.mapApiData(items));

    this.listing.totalItems.set(res.pagination.total ?? 0);
    this.listing.totalPages.set(res.pagination.totalPages ?? 1);
    this.listing.currentPage.set((res.pagination.page ?? 1) - 1);
  }

  private mapApiData(items: any[]): any[] {
    // console.log("items >> ", items)
    return items.map((item: any) => ({
      id: item.claimId,
      claimNo: item.voucherNo,
      createDate: item.claimDate,
      status: item.status,
      amount: item.totalAmount,
      ...item,
    }));
  }

  async deleteRequest(id: string) {
    const confirmed = await this.dialogService.confirm({
      title: 'ยืนยันการลบ',
      message: `ยืนยันการลบรายการเบิกเลขที่ ${id}?`,
      type: 'danger',
      confirmText: 'ลบรายการ',
    });

    if (confirmed) {
      this.transportService.deleteRequest(id).subscribe(() => {
        this.toastService.success('ลบรายการเรียบร้อยแล้ว');
        this.loadData();
      });
    }
  }

  openModal(id: string = '') {
    if (id === '') {
      this.selectedRequestId = '';
      this.isModalOpen = true;
    } else {
      this.selectedRequestId = id;
      this.isModalOpen = true;
    }

    if (!this.selectedRequestId) return;

    const result = this.allRequests().find((item) => item.id === this.selectedRequestId);

    this.selectedRequest = result;
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedRequestId = '';
    this.selectedRequest = '';
    this.loadData();
  }

  clearFilters() {
    clearListingFilters(this.listing);
    this.dateRange = null;
    this.loadData();
  }

  trackById(_: number, claim: any): number {
    return claim.claimId;
  }

  trackByRowId(
    index: number,
    itemOrRow: VehicleRequest | import('@tanstack/angular-table').Row<VehicleRequest>,
  ): string {
    const item = 'original' in itemOrRow ? itemOrRow.original : itemOrRow;
    return `${item.id}-${index}`;
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
