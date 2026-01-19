import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleTaxiFormComponent } from '../../components/features/vehicle-taxi-form/vehicle-taxi-form';

@Component({
  selector: 'app-vehicle-taxi',
  standalone: true,
  imports: [CommonModule, FormsModule, VehicleTaxiFormComponent],
  templateUrl: './vehicle-taxi.html',
  styleUrl: './vehicle-taxi.scss',
})
export class VehicleTaxiComponent {
  filterStartDate: string = '';
  filterEndDate: string = '';
  filterStatus: string = '';
  isModalOpen: boolean = false;

  // ข้อมูล Mockup ตามภาพ image_fb033c.png
  tableData = [
    {
      id: '2701#001',
      createDate: '15/01/2026',
      status: 'รอตรวจสอบ',
      items: [
        { requestDate: '27/10/2026', desc: 'ถ่ายงานหลังรายการแฉ', destination: 'Bravo Studio', distance: 10.00, amount: 120 },
        { requestDate: '22/10/2026', desc: 'สแตนด์บายงาน', destination: 'GMM Studio', distance: 4.50, amount: 120 },
        { requestDate: '15/10/2026', desc: 'ทดสอบการเบิก', destination: 'สักที่', distance: 2.00, amount: 120 },
        { requestDate: '01/10/2026', desc: 'ทดสอบการเบิก', destination: 'สักแห่ง', distance: 5.00, amount: 120 }
      ]
    },
    {
      id: '2701#002',
      createDate: '17/01/2026',
      status: 'ต้นสังกัดอนุมัติ',
      items: [
        { requestDate: '27/10/2026', desc: 'ทดสอบ1', destination: 'สักหน', distance: 6.25, amount: 120 },
        { requestDate: '28/10/2026', desc: 'ทดสอบ2', destination: 'Some where', distance: 7.75, amount: 120 },
        { requestDate: '29/10/2026', desc: 'ทดสอบ3', destination: 'ไปห้าง', distance: 100.00, amount: 120 },
        { requestDate: '30/10/2026', desc: 'ทดสอบ4', destination: 'ไปสวนสัตว์', distance: 1.00, amount: 120 }
      ]
    }
  ];

  getStatusClass(status: string) {
    switch (status) {
      case 'รอตรวจสอบ': return 'status-pending';
      case 'ต้นสังกัดอนุมัติ': return 'status-dept';
      case 'HR อนุมัติ': return 'status-hr';
      case 'CEO อนุมัติ': return 'status-ceo';
      case 'ACC อนุมัติ': return 'status-success';
      default: return '';
    }
  }

  openModal() { this.isModalOpen = true; }
  closeModal() { this.isModalOpen = false; }
}