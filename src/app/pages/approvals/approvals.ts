import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ApprovalItem {
  requestNo: string;
  requestDate: string;
  requestBy: {
    name: string;
    employeeId: string;
    department: string;
    company: string;
  };
  requestType: string;
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
})
export class ApprovalsComponent {
  tabs = ['Pending', 'Approved', 'Rejected', 'Referred Back'];
  activeTab = signal<string>('Pending'); 
  searchText = signal<string>('');

  data = signal<ApprovalItem[]>([
    {
      requestNo: '2701#001',
      requestDate: '21-Jan-2026',
      requestBy: {
        name: 'แพรวนภา บุตรโคษา (แพรว)',
        employeeId: 'OTD01050',
        department: '10806-IT Department',
        company: 'บริษัท OTD',
      },
      requestType: 'ค่าเบี้ยเลี้ยง',
      requestDetail: 'มา Stand by วันหยุด',
      amount: 500,
      status: 'Pending',
    },
    {
      requestNo: '2701#002',
      requestDate: '20-Jan-2026',
      requestBy: {
        name: 'พิมชนารถ ประเสริฐศรี(พิม)',
        employeeId: 'OTD01051',
        department: '10807-HR Department',
        company: 'บริษัท OTD',
      },
      requestType: 'ค่ารถ',
      requestDetail: 'OT วันเสาร์',
      amount: 1200,
      status: 'Pending',
    },
    {
      requestNo: '2701#003',
      requestDate: '19-Jan-2026',
      requestBy: {
        name: 'อภิเชษฐ์ ประภาสปิยากร(เบนซ์)',
        employeeId: 'OTD01052',
        department: '10808-Finance',
        company: 'บริษัท OTD',
      },
      requestType: 'ค่าแท็กซี่',
      requestDetail: 'เดินทางไปประชุมลูกค้า',
      amount: 850,
      status: 'Pending',
    },
    {
      requestNo: '2701#004',
      requestDate: '18-Jan-2026',
      requestBy: {
        name: 'ศตวรรต เสนาจันทร์า(บูม)',
        employeeId: 'OTD01053',
        department: '10806-IT Department',
        company: 'บริษัท OTD',
      },
      requestType: 'ค่าสมรส',
      requestDetail: 'ซื้อ Keyboard ใหม่',
      amount: 2500,
      status: 'Pending',
    },
    {
      requestNo: '2701#005',
      requestDate: '18-Jan-2026',
      requestBy: {
        name: 'รภีพาญจณ์ พิภัฌรเวชกุล(โจรา)',
        employeeId: 'OTD01053',
        department: '10806-IT Department',
        company: 'บริษัท OTD',
      },
      requestType: 'ผู้ป่วยนอก',
      requestDetail: 'ซื้อ Keyboard ใหม่',
      amount: 5000,
      status: 'Pending',
    },
    {
      requestNo: '2701#006',
      requestDate: '18-Jan-2026',
      requestBy: {
        name: 'รภีพาญจณ์ พิภัฌรเวชกุล(โจรา)',
        employeeId: 'OTD01053',
        department: '10806-IT Department',
        company: 'บริษัท OTD',
      },
      requestType: 'ค่าอุปกรณ์',
      requestDetail: 'ซื้อ Keyboard ใหม่',
      amount: 5000,
      status: 'Approved',
    },
    {
      requestNo: '2701#007',
      requestDate: '18-Jan-2026',
      requestBy: {
        name: 'รภีพาญจณ์ พิภัฌรเวชกุล(โจรา)',
        employeeId: 'OTD01053',
        department: '10806-IT Department',
        company: 'บริษัท OTD',
      },
      requestType: 'ค่าอุปกรณ์',
      requestDetail: 'ซื้อ Keyboard ใหม่',
      amount: 5000,
      status: 'Referred Back',
    },
    {
      requestNo: '2701#008',
      requestDate: '18-Jan-2026',
      requestBy: {
        name: 'รภีพาญจณ์ พิภัฌรเวชกุล(โจรา)',
        employeeId: 'OTD01053',
        department: '10806-IT Department',
        company: 'บริษัท OTD',
      },
      requestType: 'ค่าอุปกรณ์',
      requestDetail: 'ซื้อ Keyboard ใหม่',
      amount: 5000,
      status: 'Rejected',
    },
  ]);

  filteredData = computed(() => {
    const statusFilter = this.activeTab();
    const searchFilter = this.searchText().toLowerCase();
    
    return this.data().filter((item) => {
      const matchesTab = item.status === statusFilter;
      const matchesSearch = 
        item.requestNo.toLowerCase().includes(searchFilter) ||
        item.requestBy.name.toLowerCase().includes(searchFilter) ||
        item.requestType.toLowerCase().includes(searchFilter) ||
        item.requestDetail.toLowerCase().includes(searchFilter);
      
      return matchesTab && matchesSearch;
    });
  });

  setActiveTab(tab: string): void {
    this.activeTab.set(tab);
  }

  getTabCount(tab: string): number {
    return this.data().filter((item) => item.status === tab).length;
  }

  onSearch(event: any): void {
    this.searchText.set(event.target.value);
  }

  approve(item: ApprovalItem): void {
    this.updateStatus(item, 'Approved');
  }

  reject(item: ApprovalItem): void {
    this.updateStatus(item, 'Rejected');
  }

  referBack(item: ApprovalItem): void {
    this.updateStatus(item, 'Referred Back');
  }

  private updateStatus(item: ApprovalItem, newStatus: ApprovalItem['status']): void {
    this.data.update((items) =>
      items.map((i) => (i.requestNo === item.requestNo ? { ...i, status: newStatus } : i))
    );
  }

  refresh(): void {
    console.log('Refreshing data...');
  }

  viewDetail(item: ApprovalItem): void {
    console.log('View detail:', item);
  }
}