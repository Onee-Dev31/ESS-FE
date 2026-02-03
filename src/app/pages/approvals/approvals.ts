import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  createAngularTable,
  getCoreRowModel,
  SortingState,
} from '@tanstack/angular-table';
import { ApprovalDetailModalComponent } from '../../components/modals/approval-detail-modal/approval-detail-modal';
import { ApprovalItem } from '../../interfaces/approval.interface';
import { ApprovalsHelperService } from '../../services/approvals-helper.service';
import { DateUtilityService } from '../../services/date-utility.service';
import { APPROVAL_STATUS_TABS } from '../../config/constants';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { createListingState, createListingComputeds } from '../../utils/listing.util';

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule, ApprovalDetailModalComponent, PageHeaderComponent, PaginationComponent],
  templateUrl: './approvals.html',
  styleUrl: './approvals.scss',
})
export class ApprovalsComponent implements OnInit {
  private approvalsHelper = inject(ApprovalsHelperService);
  private dateUtil = inject(DateUtilityService);
  private route = inject(ActivatedRoute);

  listing = createListingState();
  tabs = APPROVAL_STATUS_TABS;

  isModalOpen = signal<boolean>(false);
  selectedItem = signal<ApprovalItem | null>(null);
  initialAction = signal<'Approved' | 'Rejected' | 'Referred Back' | null>(null);

  approvals = signal<ApprovalItem[]>([]);
  sorting = signal<SortingState>([{ id: 'requestNo', desc: true }]);

  pageTitle = signal<string>('Pending Approvals');
  category: 'all' | 'medical' = 'all';

  constructor() {
    this.listing.filterStatus.set('Pending');
  }

  ngOnInit() {
    // Detect mode from route
    this.route.data.subscribe(data => {
      this.category = data['category'] || 'all';
      this.pageTitle.set(this.category === 'medical' ? 'Medical Expenses Approvals' : 'Pending Approvals');
      this.refresh();
    });
  }

  refresh() {
    this.approvalsHelper.getApprovals(this.category).subscribe(allData => {
      this.approvals.set(allData);
    });
  }

  comps = createListingComputeds(
    this.approvals,
    this.listing,
    (item, search, status) => {
      const matchStatus = !status || item.status === status;
      const matchSearch = !search ||
        item.requestNo.toLowerCase().includes(search) ||
        item.requestBy.name.toLowerCase().includes(search) ||
        item.requestDetail.toLowerCase().includes(search);
      return matchStatus && matchSearch;
    }
  );

  sortedData = computed(() => {
    let list = [...this.comps.filteredData()];
    const sortState = this.sorting()[0];
    if (sortState) {
      return this.approvalsHelper.sortData(list, sortState.id, sortState.desc);
    }
    return list;
  });

  paginatedRows = computed(() => {
    const start = this.listing.currentPage() * this.listing.pageSize();
    return this.sortedData().slice(start, start + this.listing.pageSize());
  });

  table = createAngularTable(() => ({
    data: this.paginatedRows(),
    columns: [
      { accessorKey: 'requestNo', header: 'Request No' },
      { accessorKey: 'requestDate', header: 'Date Created' },
      { accessorKey: 'requestBy', header: 'Requester Info' },
      { accessorKey: 'requestType', header: 'Type' },
      { accessorKey: 'requestDetail', header: 'Description' },
      { accessorKey: 'amount', header: 'Amount' },
      { accessorKey: 'status', header: 'Status' },
    ],
    state: { sorting: this.sorting() },
    onSortingChange: (updaterOrValue) => {
      const next = typeof updaterOrValue === 'function' ? updaterOrValue(this.sorting()) : updaterOrValue;
      this.sorting.set(next);
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  }));

  setActiveTab(tab: string) {
    this.listing.filterStatus.set(tab);
    this.listing.currentPage.set(0);
  }

  getTabCount(tab: string) {
    return this.approvals().filter(item => item.status === tab).length;
  }

  onSearch(event: any) {
    this.listing.searchText.set(event.target.value);
    this.listing.currentPage.set(0);
  }

  setPageSize(size: number) {
    this.listing.pageSize.set(size);
    this.listing.currentPage.set(0);
  }

  goToPage(page: number) {
    this.listing.currentPage.set(page);
  }

  toggleSort(columnId: string) {
    const column = this.table.getColumn(columnId);
    if (column) {
      column.toggleSorting(column.getIsSorted() === 'asc');
    } else {
      const currentSort = this.sorting()[0];
      this.sorting.set([{ id: columnId, desc: currentSort?.id === columnId ? !currentSort.desc : false }]);
    }
  }

  getSortIcon(columnId: string) {
    const isSorted = this.table.getColumn(columnId)?.getIsSorted();
    return {
      'fa-sort-amount-up': isSorted === 'asc',
      'fa-sort-amount-down-alt': isSorted === 'desc',
      'fa-sort': !isSorted,
      'text-muted': !isSorted
    };
  }

  viewDetail(item: ApprovalItem) {
    this.selectedItem.set(item);
    this.initialAction.set(null);
    this.isModalOpen.set(true);
  }

  openActionModal(item: ApprovalItem, action: 'Approved' | 'Rejected' | 'Referred Back') {
    this.selectedItem.set(item);
    this.initialAction.set(action);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedItem.set(null);
    this.initialAction.set(null);
  }

  onStatusUpdated() {
    this.refresh();
  }

  getTimeAgo(date: string): string {
    return this.dateUtil.getTimeAgo(date);
  }

  getStatusClass(status: string): string {
    return this.approvalsHelper.getStatusClass(status);
  }

  trackByRowId(index: number, item: any): string {
    const core = item?.original || item;
    return `${core.requestNo || 'row'}-${index}`;
  }
}
