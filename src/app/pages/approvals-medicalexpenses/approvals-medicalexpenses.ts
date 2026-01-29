import { Component, signal, computed, ViewEncapsulation, inject, OnInit } from '@angular/core';
// Rebuild trigger
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MedicalexpensesService, MedicalRequest } from '../../services/medicalexpenses.service';
import { take } from 'rxjs/operators';
import {
  createAngularTable,
  getCoreRowModel,
  getPaginationRowModel,
  SortingState,
} from '@tanstack/angular-table';
import { ApprovalDetailModalComponent, ApprovalItem } from '../../components/modals/approval-detail-modal/approval-detail-modal';
import { APPROVAL_STATUS_TABS } from '../../config/constants';

@Component({
  selector: 'app-approvals-medicalexpenses',
  standalone: true,
  imports: [CommonModule, FormsModule, ApprovalDetailModalComponent],
  templateUrl: './approvals-medicalexpenses.html',
  styleUrl: './approvals-medicalexpenses.scss',
  encapsulation: ViewEncapsulation.None
})
export class ApprovalsMedicalexpensesComponent implements OnInit {
  private medicalService = inject(MedicalexpensesService);
  private router = inject(Router);
  protected readonly Math = Math;

  tabs = APPROVAL_STATUS_TABS;
  activeTab = signal<string>('Pending');
  searchText = signal<string>('');

  isModalOpen = signal<boolean>(false);
  selectedItem = signal<ApprovalItem | null>(null);
  initialAction = signal<'Approved' | 'Rejected' | 'Referred Back' | null>(null);

  approvals = signal<ApprovalItem[]>([]);
  sorting = signal<SortingState>([{ id: 'requestNo', desc: true }]);

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.medicalService.getMedicalRequests().pipe(take(1)).subscribe((requests) => {
      const mappedData = requests.map(req => this.mapToApproval(req));
      this.approvals.set(mappedData.sort((a, b) => b.requestNo.localeCompare(a.requestNo)));
    });
  }

  private mapToApproval(req: MedicalRequest): ApprovalItem {
    // Determine status key for frontend
    let status: 'Pending' | 'Approved' | 'Rejected' | 'Referred Back' = 'Pending';
    const s = req.status?.trim();
    if (s === 'ไม่อนุมัติ') status = 'Rejected';
    else if (s === 'รอแก้ไข') status = 'Referred Back';
    else if (s === 'อนุมัติแล้ว' || s?.includes('จ่าย')) status = 'Approved';

    // Default fallback 'Pending' matches many existing statuses like 'รอพนักงานยืนยัน' etc.

    const defaultUser = {
      name: 'พนักงานทดสอบ',
      employeeId: 'N/A',
      department: 'N/A',
      company: 'บริษัท OTD'
    };

    return {
      requestNo: req.id,
      requestDate: req.createDate,
      requestBy: req.requester || defaultUser,
      requestType: 'ค่ารักษาพยาบาล',
      typeId: 99, // Dummy ID or map real ID if needed for routing/logic
      requestDetail: req.items.map(i => i.diseaseType).join(', '),
      amount: req.totalRequestedAmount || 0,
      status: status
    };
  }

  // Filter Logic
  filteredData = computed(() => {
    const statusFilter = this.activeTab();
    const searchFilter = this.searchText().toLowerCase();

    let filtered = this.approvals().filter(item =>
      item.status === statusFilter &&
      (item.requestNo.toLowerCase().includes(searchFilter) ||
        item.requestBy.name.toLowerCase().includes(searchFilter) ||
        item.requestDetail.toLowerCase().includes(searchFilter))
    );

    const sortState = this.sorting()[0];
    if (sortState) {
      const { id, desc } = sortState;
      const direction = desc ? -1 : 1;

      filtered.sort((itemA, itemB) => {
        let valueA: any, valueB: any;
        switch (id) {
          case 'requestNo': return itemA.requestNo.localeCompare(itemB.requestNo) * direction;
          case 'requestDate':
            valueA = itemA.requestDate.split('/').reverse().join('');
            valueB = itemB.requestDate.split('/').reverse().join('');
            return valueA.localeCompare(valueB) * direction;
          case 'requestBy': return itemA.requestBy.name.localeCompare(itemB.requestBy.name) * direction;
          case 'requestType': return itemA.requestType.localeCompare(itemB.requestType) * direction;
          case 'amount': return (itemA.amount - itemB.amount) * direction;
          case 'status': return itemA.status.localeCompare(itemB.status) * direction;
          default: return 0;
        }
      });
    }
    return filtered;
  });

  table = createAngularTable(() => ({
    data: this.filteredData(),
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
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  }));

  setActiveTab(tab: string) { this.activeTab.set(tab); }
  getTabCount(tab: string) { return this.approvals().filter(item => item.status === tab).length; }
  onSearch(event: any) { this.searchText.set(event.target.value); }

  toggleSort(columnId: string) {
    const column = this.table.getColumn(columnId);
    if (column) column.toggleSorting(column.getIsSorted() === 'asc');
    else {
      const currentSort = this.sorting()[0];
      this.sorting.set([{ id: columnId, desc: currentSort?.id === columnId ? !currentSort.desc : false }]);
    }
  }

  getSortIcon(columnId: string) {
    const sortState = this.sorting()[0];
    const isSorted = sortState?.id === columnId ? (sortState.desc ? 'desc' : 'asc') : false;
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

  onStatusUpdated() { this.refresh(); }
  goBack() { this.router.navigate(['/dashboard']); }
}
