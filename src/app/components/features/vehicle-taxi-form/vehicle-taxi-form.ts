import { Component, EventEmitter, OnInit, OnChanges, SimpleChanges, Output, Input, inject, ChangeDetectorRef } from '@angular/core';
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
export class VehicleTaxiFormComponent implements OnInit, OnChanges {
  @Input() requestId: string = '';
  @Output() onClose = new EventEmitter<void>();

  private vehicleService = inject(VehicleService);
  private cdr = inject(ChangeDetectorRef);

  // เก็บข้อมูลที่โหลดมาเพื่อใช้ตอนเปลี่ยนเดือน
  loadedRequest?: TaxiRequest;

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
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['requestId'] && !changes['requestId'].firstChange) {
      this.loadData();
    }
  }

  loadData() {
    this.vehicleService.getTaxiRequestById(this.requestId).subscribe(existingRequest => {
      this.loadedRequest = existingRequest;
      this.generateMockData();
      this.cdr.markForCheck(); // อัปเดตหน้าจอ
    });
  }

  generateMockData() {
    const existingRequest = this.loadedRequest;

    this.vehicleService.getMockTaxiLogs(9, this.selectedYear).subscribe(mockRows => {
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
      this.cdr.markForCheck();
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

    const taxiItems: TaxiItem[] = selectedItems.map(i => ({
      date: i.date,
      desc: i.desc,
      destination: i.dest,
      distance: Number(i.dist),
      amount: Number(i.amt),
      attachedFile: i.attachedFile
    }));

    this.vehicleService.getTaxiRequestById(this.requestId).subscribe(existing => {
      if (existing) {
        const updated: TaxiRequest = {
          ...existing,
          items: taxiItems
        };
        this.vehicleService.updateTaxiRequest(this.requestId, updated).subscribe(() => {
          alert('บันทึกการแก้ไขข้อมูลเรียบร้อย');
          this.onClose.emit();
        });
      } else {
        const newReq: TaxiRequest = {
          id: this.requestId,
          createDate: new Date().toLocaleDateString('en-GB'), // วันที่ dd/mm/yyyy
          status: 'รอตรวจสอบ',
          items: taxiItems
        };
        this.vehicleService.addTaxiRequest(newReq).subscribe(() => {
          alert(`สร้างรายการเบิก Taxi เลขที่ ${this.requestId} สำเร็จ`);
          this.onClose.emit();
        });
      }
    });
  }

  cancel() {
    this.onClose.emit();
  }

  openUploadModal(item: any) {
    this.currentUploadItem = item;
    this.isShowUploadModal = true;
  }

  closeUploadModal() {
    this.isShowUploadModal = false;
    this.currentUploadItem = null;
  }

  handleFileSave(fileName: string | null) {
    if (this.currentUploadItem) {
      this.currentUploadItem.attachedFile = fileName;
      if (fileName) {
        this.currentUploadItem.selected = true;
      }
    }
    this.closeUploadModal();
  }
}