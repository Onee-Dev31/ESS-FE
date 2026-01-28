import { Component, EventEmitter, OnInit, OnChanges, SimpleChanges, Output, Input, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileUploadModal } from '../../modals/file-upload-modal/file-upload-modal';
import { TaxiService, TaxiRequest, TaxiItem } from '../../../services/taxi.service';
import { AlertService } from '../../../services/alert.service';
import { WELFARE_TYPES } from '../../../constants/welfare-types.constant';

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

  private taxiService = inject(TaxiService);
  private alertService = inject(AlertService);
  private cdr = inject(ChangeDetectorRef);

  loadedRequest?: TaxiRequest;

  items: any[] = [];

  thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  years = [2568, 2569, 2570];

  selectedMonthIndex: number = 9;
  selectedYear: number = 2568;

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
    this.taxiService.getTaxiRequestById(this.requestId).subscribe(existingRequest => {
      this.loadedRequest = existingRequest;
      this.generateMockData();
      this.cdr.markForCheck();
    });
  }

  // สร้างข้อมูลจำลองรายการค่าแท็กซี่
  generateMockData() {
    const existingRequest = this.loadedRequest;

    this.taxiService.getMockTaxiLogs(this.selectedMonthIndex, this.selectedYear).subscribe(mockLogs => {
      this.items = mockLogs.map((row: any) => {
        const matchingItem = existingRequest?.items.find(reqItem => reqItem.date === row.date);

        return {
          ...row,
          description: matchingItem ? matchingItem.description : row.description,
          destination: matchingItem ? matchingItem.destination : row.destination,
          distance: matchingItem ? matchingItem.distance : row.distance,
          amount: matchingItem ? matchingItem.amount : row.amount,
          selected: !!matchingItem,
          attachedFile: matchingItem?.attachedFile || null
        };
      });
      this.cdr.markForCheck();
    });
  }

  getTotalAmount() {
    return this.items
      .filter(item => item.selected)
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }

  // ตรวจสอบความครบถ้วนและบันทึกคำขอค่าแท็กซี่
  save() {
    const selectedItems = this.items.filter(item => item.selected);

    if (selectedItems.length === 0) {
      this.alertService.showWarning('กรุณาเลือกรายการที่ต้องการเบิก');
      return;
    }

    const invalidItem = selectedItems.find(item =>
      !item.description || item.description.trim() === '' ||
      !item.destination || item.destination.trim() === '' ||
      item.amount === null || item.amount === undefined || item.amount <= 0
    );

    if (invalidItem) {
      this.alertService.showWarning(`กรุณากรอกข้อมูลให้ครบถ้วนในรายการวันที่ ${invalidItem.date} (ขอบแดง)`);
      return;
    }

    const taxiItems: TaxiItem[] = selectedItems.map(item => ({
      date: item.date,
      description: item.description,
      destination: item.destination,
      distance: Number(item.distance),
      amount: Number(item.amount),
      attachedFile: item.attachedFile
    }));

    this.taxiService.getTaxiRequestById(this.requestId).subscribe(existingRequest => {
      if (existingRequest) {
        const updatedRequest: TaxiRequest = {
          ...existingRequest,
          items: taxiItems
        };
        this.taxiService.updateTaxiRequest(this.requestId, updatedRequest).subscribe(() => {
          this.alertService.showSuccess('บันทึกการแก้ไขข้อมูลเรียบร้อย');
          this.onClose.emit();
        });
      } else {
        const newRequest: TaxiRequest = {
          id: this.requestId,
          typeId: WELFARE_TYPES.TAXI,
          createDate: new Date().toLocaleDateString('en-GB'),
          status: 'รอตรวจสอบ',
          items: taxiItems
        };
        this.taxiService.addTaxiRequest(newRequest).subscribe(() => {
          this.alertService.showSuccess(`สร้างรายการเบิก Taxi เลขที่ ${this.requestId} สำเร็จ`);
          this.onClose.emit();
        });
      }
    });
  }

  onInputChange(item: any) {
    if ((item.description && item.description.trim() !== '') ||
      (item.destination && item.destination.trim() !== '') ||
      (item.distance && item.distance > 0) ||
      (item.amount && item.amount > 0)) {
      item.selected = true;
    }
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

  // จัดการอัปเดตชื่อไฟล์เมื่ออัปโหลดไฟล์แนบสำเร็จ
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

