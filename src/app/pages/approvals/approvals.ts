import { Component, signal, computed, ViewEncapsulation, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleService, VehicleRequest, TaxiRequest, AllowanceRequest } from '../../services/vehicle.service';
import { forkJoin } from 'rxjs';
import { take } from 'rxjs/operators';

interface UnifiedItem {
  date: string;
  description?: string; // Allowance description (optional in taxi)
  desc?: string; // Taxi description (optional in allowance)
  timeIn?: string;
  timeOut?: string;
  amount: number;
  destination?: string;
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

  tabs = ['Pending', 'Approved', 'Rejected', 'Referred Back'];
  activeTab = signal<string>('Pending');
  searchText = signal<string>('');

  isModalOpen = signal<boolean>(false);
  selectedItem = signal<ApprovalItem | null>(null);
  modalActiveTab = signal<'Items' | 'Comments'>('Items');

  approvals = signal<ApprovalItem[]>([]);

  // เก็บข้อมูลหน้ารายละเอียด (Async)
  currentDetailItems = signal<UnifiedItem[]>([]);
  currentDetailType = signal<'allowance' | 'taxi' | null>(null);

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
      requestDetail: a.items[0]?.description || 'เบิกค่าเบี้ยเลี้ยงปฏิบัติงาน',
      amount: a.items.reduce((sum, i) => sum + i.amount, 0),
      status: this.mapStatus(a.status)
    }));

    const mappedTaxis: ApprovalItem[] = taxis.map(t => ({
      requestNo: t.id,
      requestDate: t.createDate,
      requestBy: t.requester || defaultUser,
      requestType: 'ค่าแท็กซี่',
      requestDetail: t.items[0]?.desc || 'เบิกค่าเดินทางไปพบลูกค้า',
      amount: t.items.reduce((sum, i) => sum + i.amount, 0),
      status: this.mapStatus(t.status)
    }));

    const mappedVehicles: ApprovalItem[] = vehicles.map(v => ({
      requestNo: v.id,
      requestDate: v.createDate,
      requestBy: v.requester || defaultUser,
      requestType: 'ค่ารถ',
      requestDetail: v.items[0]?.desc || 'ค่าเดินทาง (รถส่วนตัว/สาธารณะ)',
      amount: v.items.reduce((sum, i) => sum + i.amount, 0),
      status: this.mapStatus(v.status)
    }));

    const combined = [...mappedAllowances, ...mappedTaxis, ...mappedVehicles].sort((a, b) => b.requestNo.localeCompare(a.requestNo));
    this.approvals.set(combined);
  }

  private mapStatus(status: string): any {
    if (status.includes('รอตรวจสอบ')) return 'Pending';
    if (status.includes('อนุมัติ')) return 'Approved';
    if (status.includes('ไม่อนุมัติ')) return 'Rejected';
    return 'Pending';
  }

  filteredData = computed(() => {
    const statusFilter = this.activeTab();
    const searchFilter = this.searchText().toLowerCase();
    return this.approvals().filter(item =>
      item.status === statusFilter &&
      (item.requestNo.toLowerCase().includes(searchFilter) ||
        item.requestBy.name.toLowerCase().includes(searchFilter) ||
        item.requestDetail.toLowerCase().includes(searchFilter))
    );
  });

  // (Logic ย้ายไปที่ viewDetail) 

  modalItemsTotal = computed(() => {
    // คำนวณยอดรวม
    return this.currentDetailItems().reduce((sum, item) => sum + item.amount, 0);
  });

  setActiveTab(tab: string) { this.activeTab.set(tab); }
  getTabCount(tab: string) { return this.approvals().filter(i => i.status === tab).length; }
  onSearch(event: any) { this.searchText.set(event.target.value); }

  viewDetail(item: ApprovalItem) {
    this.selectedItem.set(item);
    this.modalActiveTab.set('Items');
    this.currentDetailItems.set([]); // Reset while loading

    // ดึงข้อมูลรายละเอียด
    if (item.requestType === 'ค่าเบี้ยเลี้ยง') {
      this.currentDetailType.set('allowance');
      this.vehicleService.getAllowanceRequestById(item.requestNo).subscribe(data => {
        if (data) {
          this.currentDetailItems.set(data.items as UnifiedItem[]);
        }
      });
    } else {
      // ค่ารถ / แท็กซี่
      this.currentDetailType.set('taxi');
      this.vehicleService.getTaxiRequestById(item.requestNo).subscribe(data => {
        if (data) {
          this.currentDetailItems.set(data.items as UnifiedItem[]);
        }
      });
    }

    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedItem.set(null);
    this.currentDetailItems.set([]);
    this.currentDetailType.set(null);
  }

  updateStatus(item: ApprovalItem, newStatus: any) {
    this.approvals.update(items => items.map(i => i.requestNo === item.requestNo ? { ...i, status: newStatus } : i));
    this.closeModal();
  }
}