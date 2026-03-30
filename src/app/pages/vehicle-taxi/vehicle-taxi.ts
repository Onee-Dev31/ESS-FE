import { Component, OnInit, signal, inject } from '@angular/core';

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
import { createListingState, createListingComputeds_v2, clearListingFilters } from '../../utils/listing.util';
import { COMMON_STATUS_OPTIONS } from '../../constants/request-status.constant';
import { AuthService } from '../../services/auth.service';

import { StatusLabelPipe } from '../../pipes/status-label.pipe';
import { DateUtilityService } from '../../services/date-utility.service';

/** หน้าแสดงรายการคำขอเบี้ยเลี้ยงค่าแท็กซี่ (Vehicle Taxi) */
@Component({
  selector: 'app-vehicle-taxi',
  standalone: true,
  imports: [CommonModule, FormsModule, VehicleTaxiFormComponent, FilePreviewModalComponent, StatusLabelPipe, PaginationComponent, PageHeaderComponent, SkeletonComponent, EmptyStateComponent],
  templateUrl: './vehicle-taxi.html',
  styleUrl: './vehicle-taxi.scss',
})
export class VehicleTaxiComponent implements OnInit {
  private taxiService = inject(TaxiService);
  private loadingService = inject(LoadingService);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);
  private errorService = inject(ErrorService);
  private authService = inject(AuthService);
  dateUtil = inject(DateUtilityService);

  isLoading = this.loadingService.loading('taxi-list');

  listing = createListingState();
  statusOptions = COMMON_STATUS_OPTIONS;

  isModalOpen = signal<boolean>(false);
  // selectedRequestId = signal<string>('');
  selectedRequestId = '';
  selectedRequest: any = null;
  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<any[]>([]);

  allRequests = signal<any[]>([]);
  comps = createListingComputeds_v2(this.allRequests, this.listing);

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
  }

  loadData() {
    this.loadingService.start('taxi-list');
    const param = {
      page: this.listing.currentPage() + 1 || 1,
      pageSize: this.listing.pageSize(),
      empCode: this.authService.userData().CODEMPID,
      searchText: this.listing.searchText() || '',
      claimStatus: this.listing.filterStatus(),
      dateFrom: this.listing.filterStartDate(),
      dateTo: this.listing.filterEndDate(),
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
      }
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
            destination: fromName && toName ? `${fromName} → ${toName}` : (fromName || toName),
            distance: 0,
            amount: d.rate_amount ?? 0,
            attachedFile: attachments.length > 0 ? (attachments[0].file_url ?? null) : null,
          };
        }),
        ...item
      } as TaxiRequest;
    });
  }

  async deleteRequest(id: string) {
    const confirmed = await this.dialogService.confirm({
      title: 'ยืนยันการลบ',
      message: `ยืนยันการลบรายการเบิกเลขที่ ${id}?`,
      type: 'danger',
      confirmText: 'ลบรายการ'
    });

    if (confirmed) {
      this.toastService.success('ลบรายการเบิกเรียบร้อยแล้ว');
      this.loadData();
    }
  }

  // openModal() {
  //   this.isModalOpen.set(true);
  // }

  openModal(id: string = '') {
    if (id === '') {
      this.selectedRequestId = '';
      this.isModalOpen.set(true);
    } else {
      this.selectedRequestId = id;
      this.isModalOpen.set(true);
    }

    if (!this.selectedRequestId) return;

    const result = this.allRequests().find(item => item.id === this.selectedRequestId);

    this.selectedRequest = result

    console.log(result, this.allRequests())
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedRequest = '';
    this.loadData();
  }

  openPreviewModalForRequest(requestId: string) {
    const request = this.allRequests().find(r => r.id === requestId);
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
  }

  trackByRowId(index: number, req: TaxiRequest): string {
    return `${req.id}-${index}`;
  }

  getStatusClass(status: string) {
    return StatusUtil.getStatusBadgeClaims(status.toLowerCase());
  }
}
