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
import { VehicleService, VehicleRate, VehicleConditions } from '../../services/vehicle.service';
import { SwalService } from '../../services/swal.service';
import { AuthService } from '../../services/auth.service';
import { DateUtilityService } from '../../services/date-utility.service';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { en_US, NzI18nService } from 'ng-zorro-antd/i18n';
import dayjs from 'dayjs';
import { NzSelectModule } from 'ng-zorro-antd/select';

/** ข้อความ fallback ของ popup เงื่อนไข (ใช้ก่อน API ตอบกลับ หรือถ้าเรียก API ไม่สำเร็จ) */
const DEFAULT_POLICY_TEXTS: Record<string, string> = {
  cond1_title: 'เข้างานก่อน **{earlyCheckin}** หรือ ออกงานหลัง **{lateCheckout}**',
  cond1_desc: 'เข้าเงื่อนไขข้อใดข้อหนึ่ง หรือทั้งสองข้อในวันเดียวกันก็ได้',
  cond2_title: 'เข้างานสายได้ไม่เกิน **{lateTolerance}**',
  cond2_desc: 'เทียบกับเวลาเข้างานตามกะที่กำหนดไว้',
  cond3_title: 'ต้องสแกนบัตรเข้า-ออกครบทั้งสองครั้ง',
  cond3_desc: 'วันที่สแกนไม่ครบจะไม่นับเป็นวันมีสิทธิ์เบิก',
  rates_note:
    'แต่ละอัตราคิดแยกตามเงื่อนไข หากวันเดียวกันเข้าเงื่อนไขทั้งเข้าก่อน {earlyCheckin} และออกหลัง {lateCheckout} จะได้รับเงินรวมทั้งสองอัตรา',
  example_text:
    'เข้างานเวลา **05:30 น.** และเลิกงานเวลา **23:00 น.** ในวันเดียวกัน เข้าเงื่อนไขทั้ง "ก่อน {earlyCheckin}" และ "หลัง {lateCheckout}" พร้อมกัน จึงได้รับเงินของ **ทั้งสองอัตรารวมกัน** ไม่ใช่แค่อัตราเดียว (ตามอัตราปัจจุบันด้านบน รวมเป็น **240 บาท** ในวันนั้น)',
};

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
  isPolicyModalOpen = signal<boolean>(false);
  rates = signal<VehicleRate[]>([]);
  conditions = signal<VehicleConditions | null>(null);

  earlyCheckinLabel = computed(() => {
    const c = this.conditions();
    return c ? `${c.early_checkin_time.slice(0, 5)} น.` : '06:00 น.';
  });
  lateCheckoutLabel = computed(() => {
    const c = this.conditions();
    return c ? `${String(c.late_checkout_hour).padStart(2, '0')}:00 น.` : '22:00 น.';
  });
  lateToleranceLabel = computed(() => {
    const c = this.conditions();
    return c ? `${c.late_tolerance_min} นาที` : '15 นาที';
  });

  policyTexts = signal<Record<string, string>>({});

  private tokenValues = computed(() => ({
    earlyCheckin: this.earlyCheckinLabel(),
    lateCheckout: this.lateCheckoutLabel(),
    lateTolerance: this.lateToleranceLabel(),
  }));

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
    this.getRates();
    this.getConditions();
    this.getPolicyTexts();
  }

  getRates() {
    this.vehicleService.getRates().subscribe({
      next: (res) => this.rates.set(res.data),
      error: () => {},
    });
  }

  getConditions() {
    this.vehicleService.getConditions().subscribe({
      next: (res) => this.conditions.set(res.data),
      error: () => {},
    });
  }

  getPolicyTexts() {
    this.vehicleService.getPolicyTexts().subscribe({
      next: (res) => {
        const map: Record<string, string> = {};
        for (const t of res.data) map[t.text_key] = t.content;
        this.policyTexts.set(map);
      },
      error: () => {},
    });
  }

  renderSegments(key: string): { text: string; bold: boolean }[] {
    const raw = this.policyTexts()[key] ?? DEFAULT_POLICY_TEXTS[key] ?? '';
    const tokens = this.tokenValues();
    const substituted = raw.replace(
      /\{(\w+)\}/g,
      (_, name) => (tokens as Record<string, string>)[name] ?? '',
    );
    return substituted
      .split(/(\*\*.+?\*\*)/g)
      .filter((s) => s.length > 0)
      .map((s) =>
        s.startsWith('**') && s.endsWith('**')
          ? { text: s.slice(2, -2), bold: true }
          : { text: s, bold: false },
      );
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

  async deleteRequest(claim: any) {
    console.log(claim);
    this.swalService.confirm('ยืนยันการลบรายการเบิกทั้งหมด').then((result) => {
      if (!result.isConfirmed) return;
      this.swalService.loading('กำลังบันทึกข้อมูล...');

      this.vehicleService
        .deleteVehicleByEmpCode(claim.id, this.authservice.userData().CODEMPID)
        .subscribe({
          next: (res) => {
            if (!res?.success) {
              this.swalService.warning('ไม่สามารถบันทึกข้อมูลได้');
              return;
            }

            this.swalService.success(res.message || 'ลบรายการเบิกสำเร็จ');
            this.closeModal();
          },

          error: (error) => {
            console.error('Delete Vehicle Claim Error:', error);

            this.swalService.warning(
              'เกิดข้อผิดพลาด',
              error?.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้',
            );
          },
        });
    });
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
