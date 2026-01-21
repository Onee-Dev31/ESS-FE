import { Component, signal, computed, ViewEncapsulation, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleService } from '../../services/vehicle.service';

interface UnifiedItem {
  date: string;
  description?: string;
  desc?: string;
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

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    const allowances = this.vehicleService.getAllowanceRequests()();
    const taxis = this.vehicleService.getTaxiRequests()();
    
    const mockUser = {
      name: 'รภีพาญจณ์ พิภัฌรเวชกุล(โจรา)',
      employeeId: 'OTD01054',
      department: '10806-IT Department',
      company: 'บริษัท OTD'
    };

    const mappedAllowances: ApprovalItem[] = allowances.map(a => ({
      requestNo: a.id,
      requestDate: a.createDate,
      requestBy: mockUser,
      requestType: 'ค่าเบี้ยเลี้ยง',
      requestDetail: a.items[0]?.description || 'เบิกค่าเบี้ยเลี้ยงปฏิบัติงาน',
      amount: a.items.reduce((sum, i) => sum + i.amount, 0),
      status: this.mapStatus(a.status)
    }));

    const mappedTaxis: ApprovalItem[] = taxis.map(t => ({
      requestNo: t.id,
      requestDate: t.createDate,
      requestBy: { ...mockUser, name: 'แพรวนภา บุตรโคษา (แพรว)' },
      requestType: t.items[0]?.desc?.includes('แท็กซี่') ? 'ค่าแท็กซี่' : 'ค่ารถ',
      requestDetail: t.items[0]?.desc || 'เบิกค่าเดินทางไปพบลูกค้า',
      amount: t.items.reduce((sum, i) => sum + i.amount, 0),
      status: this.mapStatus(t.status)
    }));

    const combined = [...mappedAllowances, ...mappedTaxis].sort((a, b) => b.requestNo.localeCompare(a.requestNo));
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

  selectedRequestDetails = computed(() => {
    const item = this.selectedItem();
    if (!item) return null;
    if (item.requestType === 'ค่าเบี้ยเลี้ยง') {
      const data = this.vehicleService.getAllowanceRequestById(item.requestNo);
      return data ? { type: 'allowance', items: data.items as UnifiedItem[] } : null;
    } 
    const data = this.vehicleService.getTaxiRequestById(item.requestNo);
    return data ? { type: 'taxi', items: data.items as UnifiedItem[] } : null;
  });

  modalItemsTotal = computed(() => {
    const details = this.selectedRequestDetails();
    return details?.items?.reduce((sum, item) => sum + item.amount, 0) || 0;
  });

  setActiveTab(tab: string) { this.activeTab.set(tab); }
  getTabCount(tab: string) { return this.approvals().filter(i => i.status === tab).length; }
  onSearch(event: any) { this.searchText.set(event.target.value); }

  viewDetail(item: ApprovalItem) {
    this.selectedItem.set(item);
    this.modalActiveTab.set('Items');
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedItem.set(null);
  }

  updateStatus(item: ApprovalItem, newStatus: any) {
    this.approvals.update(items => items.map(i => i.requestNo === item.requestNo ? { ...i, status: newStatus } : i));
    this.closeModal();
  }
}