import { Component, signal, computed, ViewEncapsulation, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleService, VehicleRequest, TaxiRequest, AllowanceRequest } from '../../services/vehicle.service';
import { forkJoin } from 'rxjs';
import { take } from 'rxjs/operators';
import {
  createAngularTable,
  getCoreRowModel,
  getPaginationRowModel,
  SortingState,
} from '@tanstack/angular-table';

interface UnifiedItem {
  date: string;
  description?: string;
  timeIn?: string;
  timeOut?: string;
  amount: number;
  destination?: string;
  shiftCode?: string;
}

interface ApprovalItem {
  requestNo: string;
  requestDate: string;
  requestBy: {
    name: string;
    employeeId: string;
    department: string;
    company: string;
  };
  requestType: 'ค่าเบี้ยเลี้ยง' | 'ค่ารถ' | 'ค่าแท็กซี่';
  typeId: number;
  requestDetail: string;
  amount: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Referred Back';
}

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './approvals.html',
  styleUrl: './approvals.scss',
  encapsulation: ViewEncapsulation.None
})
export class ApprovalsComponent implements OnInit {
  private vehicleService = inject(VehicleService);
  protected readonly Math = Math;

  tabs = ['Pending', 'Approved', 'Rejected', 'Referred Back'];
  activeTab = signal<string>('Pending');
  searchText = signal<string>('');

  isModalOpen = signal<boolean>(false);
  selectedItem = signal<ApprovalItem | null>(null);
  modalActiveTab = signal<'Items' | 'Comments'>('Items');

  approvals = signal<ApprovalItem[]>([]);
  sorting = signal<SortingState>([{ id: 'requestNo', desc: true }]);

  // สถานะ Modal ยืนยันการกระทำ (Approve/Reject/Refer)
  isActionConfirm = signal<boolean>(false);
  actionType = signal<'Approved' | 'Rejected' | 'Referred Back' | null>(null);
  reasonText = signal<string>('');

  // เก็บข้อมูลหน้ารายละเอียด (Async)
  currentDetailItems = signal<UnifiedItem[]>([]);
  currentDetailType = signal<'allowance' | 'taxi' | 'vehicle' | null>(null);

  // ตัวช่วยสำหรับแสดงผลใน Template
  selectedRequestDetails = computed(() => {
    if (!this.selectedItem()) return null;
    return {
      type: this.currentDetailType(),
      items: this.currentDetailItems()
    };
  });

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    // ดึงข้อมูลทั้งหมดพร้อมกัน (ใช้ take(1) เพื่อให้ Observable จบการทำงาน)
    forkJoin({
      allowances: this.vehicleService.getAllowanceRequests().pipe(take(1)),
      taxis: this.vehicleService.getTaxiRequests().pipe(take(1)),
      vehicles: this.vehicleService.getRequests().pipe(take(1))
    }).subscribe(({ allowances, taxis, vehicles }) => {
      this.processData(allowances, taxis, vehicles);
    });
  }

  private processData(allowances: AllowanceRequest[], taxis: TaxiRequest[], vehicles: VehicleRequest[]) {
    const defaultUser = {
      name: 'Unknown',
      employeeId: 'N/A',
      department: 'N/A',
      company: 'บริษัท OTD'
    };

    const mappedAllowances: ApprovalItem[] = allowances.map(a => ({
      requestNo: a.id,
      requestDate: a.createDate,
      requestBy: a.requester || defaultUser,
      requestType: 'ค่าเบี้ยเลี้ยง',
      typeId: a.typeId,
      requestDetail: a.items[0]?.description || 'เบิกค่าเบี้ยเลี้ยงปฏิบัติงาน',
      amount: a.items.reduce((sum, i) => sum + i.amount, 0),
      status: this.mapStatus(a.status)
    }));

    const mappedTaxis: ApprovalItem[] = taxis.map(taxi => ({
      requestNo: taxi.id,
      requestDate: taxi.createDate,
      requestBy: taxi.requester || defaultUser,
      requestType: 'ค่าแท็กซี่',
      typeId: taxi.typeId,
      requestDetail: taxi.items[0]?.description || 'เบิกค่าเดินทางไปพบลูกค้า',
      amount: taxi.items.reduce((sum, item) => sum + item.amount, 0),
      status: this.mapStatus(taxi.status)
    }));

    const mappedVehicles: ApprovalItem[] = vehicles.map(vehicle => ({
      requestNo: vehicle.id,
      requestDate: vehicle.createDate,
      requestBy: vehicle.requester || defaultUser,
      requestType: 'ค่ารถ',
      typeId: vehicle.typeId,
      requestDetail: vehicle.items[0]?.description || 'ค่าเดินทาง (รถส่วนตัว/สาธารณะ)',
      amount: vehicle.items.reduce((sum, item) => sum + item.amount, 0),
      status: this.mapStatus(vehicle.status)
    }));

    const combined = [...mappedAllowances, ...mappedTaxis, ...mappedVehicles].sort((a, b) => b.requestNo.localeCompare(a.requestNo));
    this.approvals.set(combined);
  }

  private mapStatus(status: string): any {
    if (status.includes('ไม่อนุมัติ')) return 'Rejected';
    if (status.includes('อนุมัติ') || status.includes('จ่าย')) return 'Approved';
    if (status.includes('รอตรวจสอบ')) return 'Pending';
    if (status.includes('รอแก้ไข')) return 'Referred Back';
    return 'Pending';
  }

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
            // รูปแบบ dd/mm/yyyy หรือ yyyy-mm-dd
            valA = a.requestDate.split('/').reverse().join('');
            valB = b.requestDate.split('/').reverse().join('');
            return valA.localeCompare(valB) * direction;
          case 'requester':
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

  // (Logic ย้ายไปที่ viewDetail) 

  modalItemsTotal = computed(() => {
    // คำนวณยอดรวม
    return this.currentDetailItems().reduce((sum, item) => sum + item.amount, 0);
  });

  setActiveTab(tab: string) {
    this.activeTab.set(tab);
    // รีเซ็ตการเรียงลำดับเมื่อเปลี่ยนแท็บ (ถ้าจำเป็น)
  }
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

  viewDetail(item: ApprovalItem) {
    this.selectedItem.set(item);
    this.modalActiveTab.set('Items');
    this.currentDetailItems.set([]); // รีเซ็ตข้อมูลระหว่างโหลด

    // ดึงข้อมูลรายละเอียด
    if (item.requestType === 'ค่าเบี้ยเลี้ยง') {
      this.currentDetailType.set('allowance');
      this.vehicleService.getAllowanceRequestById(item.requestNo).subscribe(data => {
        if (data) {
          this.currentDetailItems.set(data.items as UnifiedItem[]);
        }
      });
    } else if (item.requestType === 'ค่าแท็กซี่') {
      this.currentDetailType.set('taxi');
      this.vehicleService.getTaxiRequestById(item.requestNo).subscribe(data => {
        if (data) {
          this.currentDetailItems.set(data.items as UnifiedItem[]);
        }
      });
    } else {
      // ค่ารถ
      this.currentDetailType.set('vehicle');
      this.vehicleService.getRequestById(item.requestNo).subscribe(data => {
        if (data) {
          this.currentDetailItems.set(data.items as UnifiedItem[]);
        }
      });
    }

    this.isModalOpen.set(true);
    this.isActionConfirm.set(false);
    this.actionType.set(null);
    this.reasonText.set('');
  }

  openActionModal(item: ApprovalItem, action: 'Approved' | 'Rejected' | 'Referred Back') {
    this.viewDetail(item);
    this.isActionConfirm.set(true);
    this.actionType.set(action);
  }

  confirmAction() {
    const item = this.selectedItem();
    const action = this.actionType();
    const reason = this.reasonText();
    if (!item || !action) return;

    if ((action === 'Rejected' || action === 'Referred Back') && !reason.trim()) {
      alert('กรุณาระบุเหตุผล (Please provide a reason)');
      return;
    }

    this.updateStatus(item, action, reason);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedItem.set(null);
    this.currentDetailItems.set([]);
    this.currentDetailType.set(null);
    this.isActionConfirm.set(false);
    this.actionType.set(null);
    this.reasonText.set('');
  }

  updateStatus(item: ApprovalItem, newStatus: any, reason?: string) {
    let type: 'allowance' | 'taxi' | 'vehicle' = 'vehicle';
    let statusLabel = 'รอตรวจสอบ'; // ค่าเริ่มต้น

    if (item.requestType === 'ค่าเบี้ยเลี้ยง') type = 'allowance';
    else if (item.requestType === 'ค่าแท็กซี่') type = 'taxi';

    if (newStatus === 'Approved') statusLabel = 'อนุมัติ';
    else if (newStatus === 'Rejected') statusLabel = 'ไม่อนุมัติ';
    else if (newStatus === 'Referred Back') statusLabel = 'รอแก้ไข';

    // เรียกใช้ Service เพื่ออัปเดตสถานะ
    this.vehicleService.updateStatus(item.requestNo, type, statusLabel);

    if (reason) {
      console.log(`Action: ${newStatus}, Reason: ${reason}`);
      // ในแอปจริง ข้อมูลนี้จะถูกส่งไปยัง Backend เพื่อเก็บประวัติหรือคอมเมนต์
    }

    // รีเฟรชรายการข้อมูลใหม่
    this.refresh();

    this.closeModal();
  }
}