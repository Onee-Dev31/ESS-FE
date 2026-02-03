import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MedicalexpensesService } from '../../services/medicalexpenses.service';
import { MedicalRequest, MedicalItem } from '../../interfaces/medical.interface';
import { MedicalPolicyModalComponent } from '../../components/modals/medical-policy-modal/medical-policy-modal';
import { MedicalexpensesForm } from '../../components/features/medicalexpenses-form/medicalexpenses-form';
import { FilePreviewModalComponent } from '../../components/modals/file-preview-modal/file-preview-modal';
import { StatusUtil } from '../../utils/status.util';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { createListingState, createListingComputeds, clearListingFilters } from '../../utils/listing.util';
import { COMMON_STATUS_OPTIONS } from '../../constants/request-status.constant';
import {
  createAngularTable,
  getCoreRowModel,
  SortingState,
} from '@tanstack/angular-table';
import dayjs from 'dayjs';
import { MONTHS_TH } from '../../constants/date.constant';
import { StatusLabelPipe } from '../../pipes/status-label.pipe';

interface FlatMedicalRow extends MedicalItem {
  requestId: string;
  createDate: string;
  status: string;
  attachedFile?: string | null;
}

@Component({
  selector: 'app-medicalexpenses',
  standalone: true,
  imports: [CommonModule, FormsModule, MedicalPolicyModalComponent, MedicalexpensesForm, StatusLabelPipe, FilePreviewModalComponent, PaginationComponent, PageHeaderComponent],
  templateUrl: './medicalexpenses.html',
  styleUrl: './medicalexpenses.scss',
})
export class MedicalexpensesComponent implements OnInit {
  private medicalService = inject(MedicalexpensesService);
  private router = inject(Router);

  listing = createListingState();

  fromMonth = signal<number>(0);
  fromYear = signal<string>((dayjs().year() - 1).toString());
  toMonth = signal<number>(11);
  toYear = signal<string>(dayjs().year().toString());

  statusOptions = COMMON_STATUS_OPTIONS;
  months = MONTHS_TH;

  allRequests = signal<MedicalRequest[]>([]);
  sorting = signal<SortingState>([{ id: 'requestId', desc: true }]);

  isModalOpen = signal<boolean>(false);
  selectedRequestId = signal<string>('');
  isPolicyModalOpen = signal<boolean>(false);
  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<any[]>([]);

  // 1. Filtered Data (Requests)
  processedData = computed(() => {
    let data = [...this.allRequests()];
    const status = this.listing.filterStatus();
    const search = this.listing.searchText().toLowerCase();

    if (status) {
      data = data.filter(r => r.status === status);
    }

    const fMonth = this.fromMonth();
    const fYear = parseInt(this.fromYear());
    const tMonth = this.toMonth();
    const tYear = parseInt(this.toYear());

    if (!isNaN(fYear) && !isNaN(tYear)) {
      const startVal = fYear * 100 + fMonth;
      const endVal = tYear * 100 + tMonth;

      data = data.filter(r => {
        const reqDate = dayjs(r.createDate);
        const currentVal = reqDate.year() * 100 + reqDate.month();
        return currentVal >= startVal && currentVal <= endVal;
      });
    }

    if (search) {
      data = data.filter(r => r.id.toLowerCase().includes(search));
    }

    return data;
  });

  // ใช้ Utility จัดการ Computed values (DRY pagination logic)
  comps = createListingComputeds(this.processedData, this.listing);

  // 2. Flattened Data for Table
  flattenedRows = computed(() => {
    return this.processedData().flatMap(req =>
      req.items.map(item => ({
        ...item,
        requestId: req.id,
        createDate: req.createDate,
        status: req.status,
        attachedFile: item.attachedFile
      } as FlatMedicalRow))
    );
  });

  // 3. Sorted Data
  sortedRows = computed(() => {
    let rows = [...this.flattenedRows()];
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
        return (((valA as any) || 0) - ((valB as any) || 0)) * direction;
      });
    }
    return rows;
  });

  // 4. Paginated Data for Table (Desktop)
  paginatedRows = computed(() => {
    const start = this.listing.currentPage() * this.listing.pageSize();
    return this.sortedRows().slice(start, start + this.listing.pageSize());
  });

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
      { accessorKey: 'attachedFile', header: 'ไฟล์แนบ' },
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

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.medicalService.getRequests().subscribe(data => this.allRequests.set(data));
  }

  openModal(targetId: string = '') {
    if (!targetId) {
      this.medicalService.generateNextId().subscribe(nid => {
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

  clearFilters() {
    clearListingFilters(this.listing);
    this.fromMonth.set(0);
    this.fromYear.set((dayjs().year() - 1).toString());
    this.toMonth.set(11);
    this.toYear.set(dayjs().year().toString());
  }

  toggleSort(columnId: string) {
    const column = this.table.getColumn(columnId);
    if (column) column.toggleSorting(column.getIsSorted() === 'asc');
  }

  openPreview(attachment?: string | null) {
    if (!attachment) return;
    this.previewFiles.set([{ fileName: attachment, date: '' }]);
    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }

  getSortIcon(columnId: string) {
    const isSorted = this.table.getColumn(columnId)?.getIsSorted();
    return {
      'fa-sort-amount-up': isSorted === 'asc',
      'fa-sort-amount-down-alt': isSorted === 'desc',
      'fa-sort': !isSorted,
      'text-muted': !isSorted,
    };
  }

  trackByRowId(index: number, item: any): string {
    const core = item?.original || item;
    return `${core.id || core.requestId || 'row'}-${index}`;
  }

  getStatusClass(status: string): string {
    return StatusUtil.getStatusBadgeClass(status);
  }
}
