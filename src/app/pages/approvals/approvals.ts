import { Component, signal, computed, ViewEncapsulation, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AllowanceService, AllowanceRequest } from '../../services/allowance.service';
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


@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule, ApprovalDetailModalComponent],
  templateUrl: './approvals.html',
  styleUrl: './approvals.scss',
  encapsulation: ViewEncapsulation.None
})
export class ApprovalsComponent implements OnInit {
  private allowanceService = inject(AllowanceService);
  private taxiService = inject(TaxiService);
  private transportService = inject(TransportService);
  private router = inject(Router);
  protected readonly Math = Math;

  tabs = ['Pending', 'Approved', 'Rejected', 'Referred Back'];
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

  // โหลดข้อมูลคำขอใหม่ทั้งหมด
  refresh() {
    forkJoin({
      allowances: this.allowanceService.getAllowanceRequests().pipe(take(1)),
      taxis: this.taxiService.getTaxiRequests().pipe(take(1)),
      vehicles: this.transportService.getRequests().pipe(take(1))
    }).subscribe(({ allowances, taxis, vehicles }) => {
      this.processData(allowances, taxis, vehicles);
    });
  }

  // รวมและแปลงข้อมูลจากหลาย Service เป็นรูปแบบรายการอนุมัติ
  private processData(allowances: AllowanceRequest[], taxis: TaxiRequest[], vehicles: VehicleRequest[]) {
    const defaultUser = {
      name: 'พนักงานทดสอบ',
      employeeId: 'N/A',
      department: 'N/A',
      company: 'บริษัท OTD'
    };

    const mapToApproval = (req: any, type: 'ค่าเบี้ยเลี้ยง' | 'ค่ารถ' | 'ค่าแท็กซี่', typeId: number, detailSub?: string): ApprovalItem => ({
      requestNo: req.id,
      requestDate: req.createDate,
      requestBy: req.requester || defaultUser,
      requestType: type,
      typeId: typeId,
      requestDetail: req.items[0]?.description || detailSub || '',
      amount: req.items.reduce((sum: number, i: any) => sum + (i.amount || 0), 0),
      status: this.mapStatus(req.status)
    });

    const combined = [
      ...allowances.map(a => mapToApproval(a, 'ค่าเบี้ยเลี้ยง', a.typeId, 'เบิกค่าเบี้ยเลี้ยงปฏิบัติงาน')),
      ...taxis.map(t => mapToApproval(t, 'ค่าแท็กซี่', t.typeId, 'เบิกค่าเดินทางไปพบลูกค้า')),
      ...vehicles.map(v => mapToApproval(v, 'ค่ารถ', v.typeId, 'ค่าเดินทาง (รถส่วนตัว/สาธารณะ)'))
    ];

    this.approvals.set(combined.sort((a, b) => b.requestNo.localeCompare(a.requestNo)));
  }

  // แปลงสถานะภาษาไทยเป็นภาษาอังกฤษประเภทต่างๆ
  private mapStatus(status: string): 'Pending' | 'Approved' | 'Rejected' | 'Referred Back' {
    const s = status?.trim();

    if (s === 'ไม่อนุมัติ') return 'Rejected';
    if (s === 'รอแก้ไข') return 'Referred Back';

    if (s === 'อนุมัติแล้ว' || s.includes('จ่าย')) return 'Approved';

    if (s === 'คำขอใหม่' ||
      s === 'ตรวจสอบแล้ว' ||
      s === 'อยู่ระหว่างการอนุมัติ' ||
      s === 'รอพนักงานยืนยัน' ||
      s === 'รอต้นสังกัดอนุมัติ' ||
      s === 'รอฝ่ายบุคคลอนุมัติ' ||
      s === 'รอผู้บริหารอนุมัติ' ||
      s === 'รอฝ่ายบัญชีอนุมัติ' ||
      s.includes('รอตรวจสอบ')) {
      return 'Pending';
    }

    return 'Pending';
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

      filtered.sort((a, b) => {
        let valA: any, valB: any;

        switch (id) {
          case 'requestNo':
            return a.requestNo.localeCompare(b.requestNo) * direction;
          case 'requestDate':
            valA = a.requestDate.split('/').reverse().join('');
            valB = b.requestDate.split('/').reverse().join('');
            return valA.localeCompare(valB) * direction;
          case 'requestBy':
            return a.requestBy.name.localeCompare(b.requestBy.name) * direction;
          case 'requestType':
            return a.requestType.localeCompare(b.requestType) * direction;
          case 'amount':
            return (a.amount - b.amount) * direction;
          case 'status':
            return a.status.localeCompare(b.status) * direction;
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
  getTabCount(tab: string) { return this.approvals().filter(i => i.status === tab).length; }

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
}
