import { Component, OnInit, signal, computed, inject } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaxiService, TaxiRequest } from '../../services/taxi.service';
import { LoadingService } from '../../services/loading';
import { ToastService } from '../../services/toast';
import { DialogService } from '../../services/dialog';
import { ErrorService } from '../../services/error';
import { VehicleTaxiFormComponent } from '../../components/features/vehicle-taxi-form/vehicle-taxi-form';
import { FilePreviewModalComponent } from '../../components/modals/file-preview-modal/file-preview-modal';
import { StatusUtil } from '../../utils/status.util';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import {
  createListingState,
  createListingComputeds_v2,
  clearListingFilters,
} from '../../utils/listing.util';
import { COMMON_STATUS_OPTIONS } from '../../constants/request-status.constant';
import { AuthService } from '../../services/auth.service';

import { StatusLabelPipe } from '../../pipes/status-label.pipe';
import { DateUtilityService } from '../../services/date-utility.service';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';
import dayjs from 'dayjs';
import { SwalService } from '../../services/swal.service';

/** ข้อความ fallback ของ popup เงื่อนไข Taxi (ใช้ก่อน API ตอบกลับ หรือถ้าเรียก API ไม่สำเร็จ) */
const DEFAULT_POLICY_TEXTS: Record<string, string> = {
  taxi_cond1_title: 'เบิกได้เฉพาะวันที่ยังมีวงเงินเหลือเท่านั้น',
  taxi_cond1_desc: 'วันที่เบิกเต็มวงเงินแล้วจะไม่แสดงในรายการให้เลือก',
  taxi_cond2_title: 'วงเงินสูงสุด **{dailyLimit}/วัน**',
  taxi_cond2_desc:
    'รวมทุกเที่ยวในวันเดียวกันต้องไม่เกิน {dailyLimit} คำนวณจากยอดที่เบิกไปแล้วในวันนั้น (ไม่นับรายการที่ถูกปฏิเสธหรือยกเลิก)',
  taxi_cond3_title: 'เพิ่มได้หลายเที่ยวต่อวัน',
  taxi_cond3_desc: 'เลือกวันที่เดิมแล้วกด "เพิ่มเที่ยว" ซ้ำได้ เช่น ขาไป-ขากลับ',
  taxi_cond4_title: 'ระบุรายละเอียดให้ครบถ้วน',
  taxi_cond4_desc: 'ต้องกรอกรายละเอียดการเบิก จากที่ไหน ไปที่ไหน และจำนวนเงินให้ครบทุกเที่ยว',
  taxi_cond5_title: 'แก้ไข/ลบได้เฉพาะสถานะ "คำขอใหม่"',
  taxi_cond5_desc: 'รายการที่ได้รับการอนุมัติแล้วจะไม่สามารถแก้ไขหรือลบได้',
};

/** หน้าแสดงรายการคำขอเบี้ยเลี้ยงค่าแท็กซี่ (Vehicle Taxi) */
@Component({
  selector: 'app-vehicle-taxi',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    VehicleTaxiFormComponent,
    FilePreviewModalComponent,
    StatusLabelPipe,
    PaginationComponent,
    PageHeaderComponent,
    SkeletonComponent,
    EmptyStateComponent,
    NzIconModule,
    NzDatePickerModule,
    NzSelectModule,
    NzInputModule,
  ],
  templateUrl: './vehicle-taxi.html',
  styleUrl: './vehicle-taxi.scss',
})
export class VehicleTaxiComponent implements OnInit {
  private taxiService = inject(TaxiService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);
  private errorService = inject(ErrorService);
  private authservice = inject(AuthService);
  private swalService = inject(SwalService);
  dateUtil = inject(DateUtilityService);

  isLoading = this.loadingService.loading('taxi-list');

  listing = createListingState();
  statusOptions = COMMON_STATUS_OPTIONS;

  isModalOpen = signal<boolean>(false);
  isPolicyModalOpen = signal<boolean>(false);
  policyTexts = signal<Record<string, string>>({});
  conditions = signal<{ daily_limit: number } | null>(null);

  dailyLimitLabel = computed(() => {
    const c = this.conditions();
    return c ? `${c.daily_limit} บาท` : '500 บาท';
  });

  private tokenValues = computed(() => ({
    dailyLimit: this.dailyLimitLabel(),
  }));
  // selectedRequestId = signal<string>('');
  selectedRequestId = '';
  selectedRequest: any = null;
  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<any[]>([]);

  allRequests = signal<any[]>([]);
  comps = createListingComputeds_v2(this.allRequests, this.listing);

  dateRange: Date[] | null = null;

  setPageSize(size: number) {
    this.listing.pageSize.set(size);
    this.listing.currentPage.set(0);
    this.loadData();
  }

  goToPage(page: number) {
    this.listing.currentPage.set(page);
    this.loadData();
  }

  ngOnInit() {
    this.loadData();
    this.getPolicyTexts();
    this.getConditions();
  }

  getPolicyTexts() {
    this.taxiService.getPolicyTexts().subscribe({
      next: (res) => {
        const map: Record<string, string> = {};
        for (const t of res.data ?? []) map[t.text_key] = t.content;
        this.policyTexts.set(map);
      },
      error: () => {},
    });
  }

  getConditions() {
    this.taxiService.getConditions().subscribe({
      next: (res) => this.conditions.set(res.data),
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

  loadData() {
    this.loadingService.start('taxi-list');

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
    this.taxiService.getTaxiClaims(param).subscribe({
      next: (res: any) => {
        this.loadingService.stop('taxi-list');
        const items = res.data ?? [];
        this.allRequests.set(this.mapApiData(items));
        this.listing.totalItems.set(res.pagination?.total ?? 0);
        this.listing.totalPages.set(res.pagination?.totalPages ?? 1);
        this.listing.currentPage.set((res.pagination?.page ?? 1) - 1);
      },
      error: (error: any) => {
        this.loadingService.stop('taxi-list');
        this.errorService.handle(error, { component: 'VehicleTaxi', action: 'load-data' });
      },
    });
  }

  private mapApiData(items: any[]): any[] {
    return items.map((item: any) => {
      return {
        id: String(item.claimId ?? ''),
        typeId: 0,
        createDate: item.claimDate ?? '',
        status: item.status ?? '',
        claimNo: item.voucherNo,
        totalAmount: item.totalAmount ?? 0,
        items: (item.details ?? []).map((d: any) => {
          const fromName: string = d.other_from?.trim() || d.location_from_name || '';
          const toName: string = d.other_to?.trim() || d.location_to_name || '';
          const attachments: any[] = d.attachments ?? [];
          return {
            date: d.work_date ?? '',
            description: d.description ?? '',
            locationFrom: fromName,
            locationTo: toName,
            destination: fromName && toName ? `${fromName} → ${toName}` : fromName || toName,
            distance: 0,
            amount: d.rate_amount ?? 0,
            attachedFile: attachments.length > 0 ? (attachments[0].file_url ?? null) : null,
          };
        }),
        ...item,
      } as TaxiRequest;
    });
  }

  async deleteRequest(claim: any) {
    console.log(claim);
    this.swalService
      .confirm(
        'ยืนยันการลบรายการเบิกทั้งหมด?',
        undefined,
        `
            <div style="display:flex; align-items:center; gap:8px; justify-content:center">
                <span style="font-size:14px; color:#94a3b8">เลขที่การเบิก</span>
                <span style="font-size:16px; font-weight:700; color:#4f6ef7">${claim.claimNo}</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px; justify-content:center">
                <span style="font-size:14px; color:#94a3b8">จำนวนรายการ</span>
                <span style="font-size:16px; font-weight:700; color:#ef4444">${claim.details.length} รายการ</span>
            </div>
        `,
      )
      .then((result) => {
        if (!result.isConfirmed) return;
        this.swalService.loading('กำลังบันทึกข้อมูล...');

        this.taxiService.deleteTaxiClaim(claim.id, this.authservice.userData().CODEMPID).subscribe({
          next: (res) => {
            if (!res?.success) {
              this.swalService.warning('ไม่สามารถบันทึกข้อมูลได้');
              return;
            }

            this.swalService.success(res.message || 'ลบรายการเบิกสำเร็จ');
            this.closeModal();
          },

          error: (error) => {
            console.error('Delete Taxi Claim Error:', error);

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
      this.isModalOpen.set(true);
    } else {
      this.selectedRequestId = id;
      this.isModalOpen.set(true);
    }

    if (!this.selectedRequestId) return;

    const result = this.allRequests().find((item) => item.id === this.selectedRequestId);

    this.selectedRequest = result;
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedRequest = '';
    this.loadData();
  }

  openPreviewModalForRequest(requestId: string) {
    const request = this.allRequests().find((r) => r.id === requestId);
    if (request?.items) {
      const files = request.items
        .filter((item: any) => item.attachedFile)
        .map((item: any) => ({ fileName: item.attachedFile, date: item.date }));

      if (files.length > 0) {
        this.previewFiles.set(files);
        this.isPreviewModalOpen.set(true);
      } else {
        this.toastService.warning('ไม่พบไฟล์แนบสำหรับรายการนี้');
      }
    }
  }

  closePreviewModal() {
    this.isPreviewModalOpen.set(false);
    this.previewFiles.set([]);
  }

  clearFilters() {
    clearListingFilters(this.listing);
    this.dateRange = null;
    this.loadData();
  }

  trackByRowId(index: number, req: TaxiRequest): string {
    return `${req.id}-${index}`;
  }

  getStatusClass(status: string) {
    return StatusUtil.getStatusBadgeClaims(status.toLowerCase());
  }
}
