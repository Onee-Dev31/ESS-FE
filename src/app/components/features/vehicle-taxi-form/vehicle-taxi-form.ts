import { Component, EventEmitter, OnInit, Output, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileUploadModal } from '../../modals/file-upload-modal/file-upload-modal';
import { VehicleService, TaxiRequest, TaxiItem } from '../../../services/vehicle.service';

@Component({
  selector: 'app-vehicle-taxi-form',
  standalone: true,
  imports: [CommonModule, FormsModule, FileUploadModal],
  templateUrl: './vehicle-taxi-form.html',
  styleUrl: './vehicle-taxi-form.scss'
})
export class VehicleTaxiFormComponent implements OnInit {
  @Input() requestId: string = '';
  @Output() onClose = new EventEmitter<void>();

  private vehicleService = inject(VehicleService);

  items: any[] = [];

  thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  years = [2568, 2569, 2570];

  selectedMonth: string = 'ตุลาคม';
  selectedYear: number = 2568;

  // Variables สำหรับ Modal
  isShowUploadModal: boolean = false;
  currentUploadItem: any = null;

  ngOnInit() {
    const existingRequest = this.vehicleService.getTaxiRequestById(this.requestId);
    this.generateMockData(existingRequest);
  }

  generateMockData(existingRequest?: TaxiRequest) {
    // In real app, convert selectedMonth string to index if needed, or pass string
    // Simplified mapping for mock

    // Get base calendar from service
    const mockRows = this.vehicleService.getMockTaxiLogs(9, this.selectedYear); // 9 = October

    this.items = mockRows.map((row: any) => {
      const matchingItem = existingRequest?.items.find(reqItem => reqItem.date === row.date);

      return {
        ...row,
        desc: matchingItem ? matchingItem.desc : row.desc,
        dest: matchingItem ? matchingItem.destination : row.dest,
        dist: matchingItem ? matchingItem.distance : row.dist,
        amt: matchingItem ? matchingItem.amount : row.amt,
        selected: !!matchingItem,
        attachedFile: matchingItem?.attachedFile || null
      };
    });
  }

  getTotalAmount() {
    return this.items
      .filter(i => i.selected)
      .reduce((sum, i) => sum + (Number(i.amt) || 0), 0);
  }

  save() {
    const selectedItems = this.items.filter(i => i.selected);

    if (selectedItems.length === 0) {
      alert('กรุณาเลือกรายการที่ต้องการเบิก');
      return;
    }

    const invalidItem = selectedItems.find(i =>
      !i.desc || i.desc.trim() === '' ||
      !i.dest || i.dest.trim() === '' ||
      i.amt === null || i.amt === undefined || i.amt <= 0
    );

    if (invalidItem) {
      alert(`กรุณากรอกข้อมูลให้ครบถ้วนในรายการวันที่ ${invalidItem.date} (ขอบแดง)`);
      return;
    }

    // Convert UI items back to TaxiItems
    const taxiItems: TaxiItem[] = selectedItems.map(i => ({
      date: i.date,
      desc: i.desc,
      destination: i.dest,
      distance: Number(i.dist),
      amount: Number(i.amt),
      attachedFile: i.attachedFile
    }));

    const existing = this.vehicleService.getTaxiRequestById(this.requestId);

    if (existing) {
      const updated: TaxiRequest = {
        ...existing,
        items: taxiItems
      };
      this.vehicleService.updateTaxiRequest(this.requestId, updated);
      alert('บันทึกการแก้ไขข้อมูลเรียบร้อย');
    } else {
      const newReq: TaxiRequest = {
        id: this.requestId,
        createDate: new Date().toLocaleDateString('en-GB'), // dd/mm/yyyy
        status: 'รอตรวจสอบ',
        items: taxiItems
      };
      this.vehicleService.addTaxiRequest(newReq);
      alert(`สร้างรายการเบิก Taxi เลขที่ ${this.requestId} สำเร็จ`);
    }

    this.onClose.emit();
  }

  cancel() {
    this.onClose.emit();
  }

  // --- Modal Logic ใหม่ ---

  openUploadModal(item: any) {
    this.currentUploadItem = item;
    this.isShowUploadModal = true;
  }

  closeUploadModal() {
    this.isShowUploadModal = false;
    this.currentUploadItem = null;
  }

  // ฟังก์ชันรับค่าเมื่อ Modal กด Save ส่งกลับมา
  handleFileSave(fileName: string | null) {
    if (this.currentUploadItem) {
      this.currentUploadItem.attachedFile = fileName;

      // Auto select ถ้ามีการแนบไฟล์
      if (fileName) {
        this.currentUploadItem.selected = true;
      }
    }
    this.closeUploadModal();
  }
}