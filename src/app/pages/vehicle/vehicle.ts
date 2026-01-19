import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VehicleFormComponent } from '../../components/vehicle-form/vehicle-form'; // Import หน้าลูก

interface RequestItem {
  date: string;
  desc: string;
  amount: number;
}

interface VehicleRequest {
  id: string;
  createDate: string;
  status: string;
  items: RequestItem[];
}

@Component({
  selector: 'app-vehicle',
  standalone: true,
  imports: [CommonModule, VehicleFormComponent], 
  templateUrl: './vehicle.html',
  styleUrl: './vehicle.scss'
})
export class VehicleComponent {

  isModalOpen: boolean = false;

  requests: VehicleRequest[] = [
    {
      id: '2701#001',
      createDate: '15/01/2026',
      status: 'รอตรวจสอบ',
      items: [
        { date: '27/10/2026', desc: 'ถ่ายงานหลังรายการแฉ', amount: 120 },
        { date: '22/10/2026', desc: 'สแตนด์บายงาน', amount: 120 },
        { date: '15/10/2026', desc: 'ทดสอบการเบิก', amount: 120 },
        { date: '01/10/2026', desc: 'ทดสอบการเบิก', amount: 120 },
      ]
    },
    {
      id: '2701#002',
      createDate: '17/01/2026',
      status: 'ต้นสังกัดอนุมัติ',
      items: [
        { date: '27/10/2026', desc: 'ทดสอบ 1', amount: 120 },
        { date: '28/10/2026', desc: 'ทดสอบ 2', amount: 120 },
        { date: '29/10/2026', desc: 'ทดสอบ 3', amount: 120 },
        { date: '30/10/2026', desc: 'ทดสอบ 4', amount: 120 },
      ]
    }
  ];

  constructor() {}

  openCreateModal() {
    this.isModalOpen = true;
  }

  closeCreateModal() {
    this.isModalOpen = false;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'รอตรวจสอบ': return 'status-pending';
      case 'ต้นสังกัดอนุมัติ': return 'status-dept';
      case 'HR อนุมัติ': return 'status-hr';
      case 'CEO อนุมัติ': return 'status-ceo';
      case 'ACC อนุมัติ': return 'status-success';
      default: return '';
    }
  }
}