import { Component, signal, computed, ViewEncapsulation, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AllowanceService } from '../../services/allowance.service';
import { AllowanceRequest } from '../../interfaces/allowance.interface';
import { TaxiService, TaxiRequest } from '../../services/taxi.service';
import { TransportService, VehicleRequest } from '../../services/transport.service';
import { forkJoin } from 'rxjs';
import { take } from 'rxjs/operators';
import {
  createAngularTable,
  getCoreRowModel,
  getPaginationRowModel,
  SortingState,
} from '@tanstack/angular-table';
import { ApprovalDetailModalComponent, ApprovalItem } from '../../components/modals/approval-detail-modal/approval-detail-modal';
import { ApprovalsHelperService } from '../../services/approvals-helper.service';
import { DateUtilityService } from '../../services/date-utility.service';
import { APPROVAL_STATUS_TABS } from '../../config/constants';
import { StatusLabelPipe } from '../../pipes/status-label.pipe';


@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule, ApprovalDetailModalComponent, StatusLabelPipe],
  templateUrl: './approvals.html',
  styleUrl: './approvals.scss',
  encapsulation: ViewEncapsulation.None
})
export class ApprovalsComponent implements OnInit {
  private allowanceService = inject(AllowanceService);
  private taxiService = inject(TaxiService);
  private transportService = inject(TransportService);
  private approvalsHelper = inject(ApprovalsHelperService);
  private dateUtil = inject(DateUtilityService);
  private router = inject(Router);
  protected readonly Math = Math;

  tabs = APPROVAL_STATUS_TABS;
  activeTab = signal<string>('รออนุมัติ');
  searchText = signal<string>('');

  isModalOpen = signal<boolean>(false);
  selectedItem = signal<ApprovalItem | null>(null);
  initialAction = signal<'Approved' | 'Rejected' | 'Referred Back' | null>(null);

  approvals = signal<ApprovalItem[]>([]);
  sorting = signal<SortingState>([{ id: 'requestNo', desc: true }]);

  ngOnInit() {
    this.refresh();
  }

  // โหลดข้อมูลคำขอใหม่ทั้งหมด
  refresh() {
    forkJoin({
      allowances: this.allowanceService.getAllowanceRequests().pipe(take(1)),
      taxis: this.taxiService.getTaxiRequests().pipe(take(1)),
      vehicles: this.transportService.getRequests().pipe(take(1))
    }).subscribe(({ allowances, taxis, vehicles }) => {
      const allData = this.approvalsHelper.processData(allowances, taxis, vehicles);
      this.approvals.set(allData.sort((itemA, itemB) => itemB.requestNo.localeCompare(itemA.requestNo)));
    });
  }

  // กรองเมธอดตาม Tab และการค้นหา
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
          case 'requestNo':
            return itemA.requestNo.localeCompare(itemB.requestNo) * direction;
          case 'requestDate':
            return itemA.requestDate.localeCompare(itemB.requestDate) * direction;
          case 'requestBy':
            return itemA.requestBy.name.localeCompare(itemB.requestBy.name) * direction;
          case 'requestType':
            return itemA.requestType.localeCompare(itemB.requestType) * direction;
          case 'amount':
            return (itemA.amount - itemB.amount) * direction;
          case 'status':
            return itemA.status.localeCompare(itemB.status) * direction;
          default:
            return 0;
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
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  }));


  // เปลี่ยน Tab การแสดงผล
  setActiveTab(tab: string) {
    this.activeTab.set(tab);
  }

  // นับจำนวนรายการในแต่ละ Tab
  getTabCount(tab: string) { return this.approvals().filter(item => item.status === tab).length; }

  onSearch(event: any) { this.searchText.set(event.target.value); }

  toggleSort(columnId: string) {
    const column = this.table.getColumn(columnId);
    if (column) {
      column.toggleSorting(column.getIsSorted() === 'asc');
    } else {
      const currentSort = this.sorting()[0];
      if (currentSort?.id === columnId) {
        this.sorting.set([{ id: columnId, desc: !currentSort.desc }]);
      } else {
        this.sorting.set([{ id: columnId, desc: false }]);
      }
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

  // ดูรายละเอียดและจัดการคำขอ
  viewDetail(item: ApprovalItem) {
    this.selectedItem.set(item);
    this.initialAction.set(null);
    this.isModalOpen.set(true);
  }

  // เปิด Modal เพื่อดำเนินการจัดการ (อนุมัติ/ไม่อนุมัติ/ส่งคืน)
  openActionModal(item: ApprovalItem, action: 'Approved' | 'Rejected' | 'Referred Back') {
    this.selectedItem.set(item);
    this.initialAction.set(action);
    this.isModalOpen.set(true);
  }

  // ปิด Modal
  closeModal() {
    this.isModalOpen.set(false);
    this.selectedItem.set(null);
    this.initialAction.set(null);
  }

  // อัปเดตข้อมูลเมื่อมีการเปลี่ยนแปลงสถานะ
  onStatusUpdated() {
    this.refresh();
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  getTimeAgo(date: string): string {
    return this.dateUtil.getTimeAgo(date);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'อนุมัติแล้ว': return 'approved';
      case 'ไม่อนุมัติ': return 'rejected';
      case 'รอแก้ไข': return 'referred-back';
      case 'รออนุมัติ': return 'pending';
      default: return 'pending';
    }
  }
}
