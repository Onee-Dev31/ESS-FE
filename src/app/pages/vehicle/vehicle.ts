import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransportService, VehicleRequest } from '../../services/transport.service';
import { LoadingService } from '../../services/loading';
import { ToastService } from '../../services/toast';
import { DialogService } from '../../services/dialog';
import { VehicleFormComponent } from '../../components/features/vehicle-form/vehicle-form';
import { StatusUtil } from '../../utils/status.util';
import { createListingState, clearListingFilters, TableSortHelper, createListingComputeds_v2 } from '../../utils/listing.util';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import {
  createAngularTable,
  getCoreRowModel,
  SortingState,
} from '@tanstack/angular-table';

import { StatusLabelPipe } from '../../pipes/status-label.pipe';
import { VehicleService } from '../../services/vehicle.service';
import { SwalService } from '../../services/swal.service';
import { AuthService } from '../../services/auth.service';
import { DateUtilityService } from '../../services/date-utility.service';

/** หน้าแสดงรายการคำขอเบี้ยเลี้ยงค่ารถ (Vehicle Allowance) */
@Component({
  selector: 'app-vehicle',
  standalone: true,
  imports: [CommonModule, FormsModule, VehicleFormComponent, StatusLabelPipe, PaginationComponent, PageHeaderComponent, EmptyStateComponent, SkeletonComponent],
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

  isModalOpen = false;
  selectedRequestId = '';
  selectedRequest: any = null;

  allRequests = signal<any[]>([]);
  listing = createListingState();
  comps = createListingComputeds_v2(this.allRequests, this.listing);

  // processedData = computed(() => {
  //   const list = [...this.allRequests()];

  //   const search = this.listing.searchText().toLowerCase();
  //   const status = this.listing.filterStatus();
  //   const start = this.listing.filterStartDate();
  //   const end = this.listing.filterEndDate();

  //   let filtered = list.filter(r => {
  //     const matchSearch = !search || r.id.toLowerCase().includes(search);
  //     const matchStatus = !status || r.status === status;
  //     const matchStart = !start || r.createDate >= start;
  //     const matchEnd = !end || r.createDate <= end;
  //     return matchSearch && matchStatus && matchStart && matchEnd;
  //   });

  //   const sortState = this.sorting()[0];
  //   if (sortState) {
  //     const { id, desc } = sortState;
  //     filtered = TableSortHelper.sortVehicleLikeData(filtered, id, desc, {
  //       desc: 'desc',
  //       date: 'date'
  //     });
  //   }
  //   return filtered;
  // });


  // table = createAngularTable(() => ({
  //   data: this.comps.paginatedData(),
  //   columns: [
  //     { accessorKey: 'id', header: 'เลขที่การเบิก' },
  //     { accessorKey: 'createDate', header: 'วันที่สร้างรายการ' },
  //     { accessorKey: 'date', header: 'วันที่ขอเบิก' },
  //     { accessorKey: 'desc', header: 'รายละเอียด' },
  //     { accessorKey: 'amount', header: 'จำนวนเงิน' },
  //     { accessorKey: 'status', header: 'สถานะ' },
  //   ],
  //   onSortingChange: (updaterOrValue) => {
  //     const next = typeof updaterOrValue === 'function' ? updaterOrValue(this.sorting()) : updaterOrValue;
  //   },
  //   getCoreRowModel: getCoreRowModel(),
  //   manualPagination: true,
  // }));

  ngOnInit() {
    this.loadData();
  }

  private loadingService = inject(LoadingService);
  isLoading = this.loadingService.loading('vehicle-list');

  loadData() {
    // this.loadingService.start('vehicle-list');

    const param = {
      page: this.listing.currentPage() + 1 || 1,
      pageSize: this.listing.pageSize(),
      empCode: this.authservice.userData().CODEMPID,
      searchText: this.listing.searchText() || '',
      claimStatus: this.listing.filterStatus(),
      dateFrom: this.listing.filterStartDate(),
      dateTo: this.listing.filterEndDate()
    }

    // console.log(param)

    this.vehicleService.getVehicleClaimByEmpcode(param).subscribe({
      next: (res) => {
        console.log(res)
        this.dataFromApi(res)
        // this.loadingService.stop('vehicle-list');
      },
      error: (error) => {
        // this.loadingService.stop('vehicle-list');

      }
    })
  }

  private dataFromApi(res: any) {
    const items = res.data ?? []
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
      ...item
    }));
  }

  async deleteRequest(id: string) {
    const confirmed = await this.dialogService.confirm({
      title: 'ยืนยันการลบ',
      message: `ยืนยันการลบรายการเบิกเลขที่ ${id}?`,
      type: 'danger',
      confirmText: 'ลบรายการ'
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

    const result = this.allRequests().find(item => item.id === this.selectedRequestId);

    this.selectedRequest = result
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedRequestId = '';
    this.selectedRequest = '';
    this.loadData();
  }

  clearFilters() {
    clearListingFilters(this.listing);
  }

  trackById(_: number, claim: any): number {
    return claim.claimId;
  }

  trackByRowId(index: number, itemOrRow: VehicleRequest | import('@tanstack/angular-table').Row<VehicleRequest>): string {
    const item = 'original' in itemOrRow ? itemOrRow.original : itemOrRow;
    return `${item.id}-${index}`;
  }

  getStatusClass(status: string) {
    return StatusUtil.getStatusBadgeClaims(status.toLowerCase());
  }

  setPageSize(size: number) {
    this.listing.pageSize.set(size);
    this.listing.currentPage.set(0);
    this.loadData()
  }

  goToPage(page: number) {
    this.listing.currentPage.set(page);
    this.loadData()
  }



}
