import {
  Component,
  EventEmitter,
  OnInit,
  OnChanges,
  AfterViewChecked,
  Output,
  Input,
  inject,
  ChangeDetectorRef,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { FileUploadModal } from '../../modals/file-upload-modal/file-upload-modal';
import { TaxiService, TaxiLogItem, TaxiLocation } from '../../../services/taxi.service';
import { ToastService } from '../../../services/toast';
import { DateUtilityService } from '../../../services/date-utility.service';
import { MasterDataService } from '../../../services/master-data.service';
import { AuthService } from '../../../services/auth.service';
import { FileConverterService } from '../../../services/file-converter';
import { SwalService } from '../../../services/swal.service';

@Component({
  selector: 'app-vehicle-taxi-form',
  standalone: true,
  imports: [CommonModule, FormsModule, FileUploadModal],
  templateUrl: './vehicle-taxi-form.html',
  styleUrl: './vehicle-taxi-form.scss',
})
export class VehicleTaxiFormComponent implements OnInit, OnChanges, AfterViewChecked {
  @Input() requests: any = null;

  @Output() onClose = new EventEmitter<void>();

  private taxiService = inject(TaxiService);
  private toastService = inject(ToastService);
  dateUtil = inject(DateUtilityService);
  private cdr = inject(ChangeDetectorRef);
  private masterDataService = inject(MasterDataService);
  private authService = inject(AuthService);
  private fileConvertService = inject(FileConverterService);
  private swalService = inject(SwalService);

  items: TaxiLogItem[] = [];
  locations: TaxiLocation[] = [];

  thaiMonths: string[] = [];
  years: number[] = [];

  selectedMonthIndex: number = new Date().getMonth();
  selectedYear: number = new Date().getFullYear() + 543;

  isLoading = false;
  isShowUploadModal: boolean = false;
  currentUploadItem: TaxiLogItem | null = null;

  isEditMode = false;
  originalClaimId?: number;

  private pendingFocusId: string | null = null;

  get pageTitle(): string {
    return this.isEditMode ? 'แก้ไขข้อมูลค่าเดินทาง (Taxi)' : 'บันทึกข้อมูลค่าเดินทาง (Taxi)';
  }

  get submitButtonText(): string {
    return this.isEditMode ? 'บันทึกการแก้ไข' : 'ยืนยันการเบิก';
  }

  ngOnInit() {
    this.masterDataService.getDateConfig().subscribe((config) => {
      this.thaiMonths = config.months;
      this.years = config.years;
    });

    this.taxiService.getLocations().subscribe({
      next: (res: any) => {
        this.locations = res.data ?? [];
        this.checkAndLoadData();
      },
      error: () => this.toastService.error('ไม่สามารถโหลดข้อมูลสถานที่ได้'),
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['requests']) {
      this.checkAndLoadData();
    }
  }

  ngAfterViewChecked() {
    if (this.pendingFocusId) {
      const id = this.pendingFocusId;
      this.pendingFocusId = null;

      const desktop = document.getElementById(id) as HTMLInputElement | null;
      const mobile = document.getElementById(`mob-${id}`) as HTMLInputElement | null;
      const el = (desktop?.offsetParent !== null ? desktop : null) ?? mobile ?? desktop;

      if (el) {
        el.focus();
        if (el instanceof HTMLInputElement) el.select();
      }
    }
  }

  private checkAndLoadData() {
    if (this.requests) {
      this.isEditMode = true;
      this.originalClaimId = this.requests.claimId;
      this.loadClaimForEdit(this.requests.claimId);
    } else {
      this.isEditMode = false;
      this.loadEligibleDates();
    }
  }

  // ====================== EDIT MODE ======================
  private loadClaimForEdit(claimId: number) {
    this.isLoading = true;
    this.items = [];
    const param = {
      page: 1,
      pageSize: 10,
      empCode: this.authService.userData().CODEMPID,
      claimId: claimId.toString() || '',
    };

    this.taxiService.getTaxiClaims(param).subscribe({
      next: (res: any) => {
        const claim = res.data[0] || res;

        const itemPromises = (claim.details || []).map(async (d: any) => {
          const attachedFiles = d.attachments
            ? await this.fileConvertService.convertUrlsToFiles(d.attachments)
            : [];

          return {
            date: d.work_date || d.workDate,
            description: d.description || '',
            destination: '',
            distance: 0,
            locationFromId: d.location_from_id || d.locationFromId,
            locationToId: d.location_to_id || d.locationToId,
            otherFrom: d.other_from || d.otherFrom || '',
            otherTo: d.other_to || d.otherTo || '',
            amount: Number(d.rate_amount || d.amount || 0),
            shiftCode: d.shift_code || d.shiftCode || '',
            selected: true,
            attachedFiles: attachedFiles,
            fileToUpload: null,
            checkIn: d.check_in || d.time_in,
            checkOut: d.check_out || d.time_out,
            dayType: d.day_type || d.dayType,
            remainingAmount: d.remaining_amount,
          };
        });

        // ใช้ Promise.all หลัง map เพื่อ resolve ทุก promise
        Promise.all(itemPromises).then((items) => {
          this.items = items;

          if (this.items.length > 0) {
            const firstDate = new Date(this.items[0].date);
            this.selectedMonthIndex = firstDate.getMonth();
            this.selectedYear = firstDate.getFullYear() + 543;
          }
        });

        setTimeout(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }, 500);
      },
      error: (err: any) => {
        console.error(err);
        this.isLoading = false;
        this.toastService.error('ไม่สามารถโหลดข้อมูลการเบิกเพื่อแก้ไขได้');
        this.onClose.emit();
      },
    });
  }

  // ====================== CREATE MODE ======================
  loadEligibleDates() {
    const empCode = this.authService.userData().CODEMPID;
    const month = this.selectedMonthIndex + 1;

    this.isLoading = true;
    this.items = [];

    this.taxiService.getEligibleDates(empCode, this.selectedYear, month).subscribe({
      next: (res: any) => {
        // console.log(res)
        const rows: any[] = res.data ?? [];
        this.items = rows.map(
          (row: any) =>
            ({
              date: row.workDate ?? row.work_date,
              description: '',
              destination: '',
              distance: 0,
              amount: 0,
              shiftCode: row.shiftCode ?? row.shift_code,
              selected: false,
              attachedFile: null,
              fileToUpload: null,
              checkIn: row.timeIn ?? row.time_in,
              checkOut: row.timeOut ?? row.time_out,
              dayType: row.dayType ?? row.day_type,
              remainingAmount: row.remainingAmount ?? row.remaining_amount ?? 500,
              locationFromId: undefined,
              locationToId: undefined,
              otherFrom: '',
              otherTo: '',
            }) as TaxiLogItem,
        );

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.toastService.error('ไม่สามารถโหลดข้อมูลวันที่ได้');
        this.cdr.markForCheck();
      },
    });
  }

  // ====================== Helper Methods ======================
  isOtherLocation(locationId: number | undefined): boolean {
    if (!locationId) return false;
    const loc = this.locations.find((l) => l.location_id === locationId);
    return loc ? !loc.is_office : false;
  }

  onFromLocationChange(item: TaxiLogItem, rowIndex: number) {
    item.selected = true;

    // ถ้า from ไม่ใช่ other → เคลียร์
    if (!this.isOtherLocation(item.locationFromId)) {
      item.otherFrom = '';
    }

    // 👉 ถ้าเลือก "อื่นๆ"
    if (this.isOtherLocation(item.locationFromId)) {
      // ต้อง force ให้ to เป็น office
      const office = this.locations.find((l) => l.is_office);
      if (office) {
        item.locationToId = office.location_id;
        item.otherTo = '';
      }

      this.pendingFocusId = `other-from-${rowIndex}`;
      return;
    }

    // 👉 ถ้า from เป็น office → to เป็น other
    const other = this.locations.find((l) => !l.is_office);
    if (other) {
      item.locationToId = other.location_id;
    }

    this.pendingFocusId = `other-to-${rowIndex}`;
  }

  onToLocationChange(item: TaxiLogItem, rowIndex: number) {
    item.selected = true;

    if (!this.isOtherLocation(item.locationToId)) {
      item.otherTo = '';
    }

    // 👉 ถ้าเลือก "อื่นๆ"
    if (this.isOtherLocation(item.locationToId)) {
      // from ต้องเป็น office
      const office = this.locations.find((l) => l.is_office);
      if (office) {
        item.locationFromId = office.location_id;
        item.otherFrom = '';
      }

      this.pendingFocusId = `other-to-${rowIndex}`;
      return;
    }

    // 👉 ถ้า to เป็น office → from เป็น other
    const other = this.locations.find((l) => !l.is_office);
    if (other) {
      item.locationFromId = other.location_id;
    }

    this.pendingFocusId = `other-from-${rowIndex}`;
  }

  onInputChange(item: TaxiLogItem) {
    if (
      item.description?.trim() ||
      item.locationFromId ||
      item.locationToId ||
      (item.amount && item.amount > 0)
    ) {
      item.selected = true;
    }
  }

  parseNumber(value: string | number): number {
    if (typeof value === 'number') return value;
    return Number(value.replace(/,/g, ''));
  }

  formatNumber(value: number): string {
    return value.toLocaleString('en-US');
  }

  onAmountInput(event: Event, item: TaxiLogItem) {
    const input = event.target as HTMLInputElement;

    // เอาเฉพาะตัวเลข
    let value = input.value.replace(/[^0-9]/g, '');

    const numericValue = Number(value || 0);

    // 👉 max จาก remaining
    const maxAmount = item.remainingAmount ?? 0;

    // ❌ ถ้าเกิน
    if (numericValue > maxAmount) {
      item.amountError = `จำนวนเงินต้องไม่เกิน ${this.formatNumber(maxAmount)} บาท`;
    } else {
      item.amountError = null;
    }

    // set ค่า
    item.amount = numericValue;

    // format ใส่ comma
    input.value = this.formatNumber(numericValue);

    // auto select
    if (numericValue > 0) {
      item.selected = true;
    }
  }

  getSelectedCount(): number {
    return this.items.filter((item) => item.selected).length;
  }

  getTotalAmount(): number {
    return this.items
      .filter((item) => item.selected)
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }

  openUploadModal(item: any) {
    // console.log(item)
    this.currentUploadItem = item;
    this.isShowUploadModal = true;
  }

  closeUploadModal() {
    this.isShowUploadModal = false;
    this.currentUploadItem = null;
  }

  handleFileSave(files: File[]) {
    if (this.currentUploadItem) {
      // เก็บไฟล์จริง
      this.currentUploadItem.attachedFiles = files;

      // เก็บชื่อไฟล์ (กรณีต้องใช้แสดง / ส่ง API แยก)
      this.currentUploadItem.attachedFileNames = files.map((f) => f.name);

      // auto select ถ้ามีไฟล์
      if (files.length > 0) {
        this.currentUploadItem.selected = true;
      }
    }

    this.closeUploadModal();
  }

  onFilesSelected(event: Event, item: any) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const files = Array.from(input.files);

    item.attachedFiles = [...(item.attachedFiles || []), ...files];
  }

  // ====================== SAVE ======================
  save() {
    const selectedItems = this.items.filter((item) => item.selected);

    // console.log(selectedItems)

    const empCode = this.authService.userData().CODEMPID;
    const details = selectedItems.map((item) => ({
      work_date: item.date.split('T')[0],
      description: item.description ?? '',
      location_from_id: item.locationFromId ?? 0,
      location_to_id: item.locationToId ?? 0,
      other_from: item.otherFrom ?? '',
      other_to: item.otherTo ?? '',
      rate_amount: Number(item.amount) || 0,
    }));

    const files: any[] = [];
    const detail_indexes: number[] = [];

    selectedItems.forEach((item, index) => {
      if (item.attachedFiles?.length) {
        item.attachedFiles.forEach((file) => {
          files.push(file);
          detail_indexes.push(index);
        });
      }
    });

    // สร้าง FormData
    const formData = new FormData();

    files.forEach((file, i) => {
      const actualFile = file instanceof File ? file : file?.file;
      if (!actualFile) return; // skip ถ้าไม่มีไฟล์จริง
      formData.append('files', actualFile);
      formData.append('detail_indexes', detail_indexes[i].toString());
    });
    details.forEach((detail) => {
      formData.append('details', JSON.stringify(detail));
    });
    formData.append('employee_code', empCode);

    // console.log("formData", [...formData.entries()]);

    // DELETE
    if (this.isEditMode && selectedItems.length === 0) {
      this.swalService.confirm('ยืนยันการลบรายการเบิกทั้งหมด').then((result) => {
        if (!result.isConfirmed) return;
        this.swalService.loading('กำลังบันทึกข้อมูล...');

        this.taxiService.deleteTaxiClaim(this.requests.id, empCode).subscribe({
          next: (res) => {
            // console.log(res)
            if (!res?.success) {
              this.swalService.warning('ไม่สามารถบันทึกข้อมูลได้');
              return;
            }

            this.swalService.success(res.message || 'ลบรายการเบิกสำเร็จ');
            this.onClose.emit();
          },

          error: (error) => {
            console.error('Delete Taxi Claim Error:', error);

            this.swalService.warning(
              'เกิดข้อผิดพลาด',
              error?.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้',
            );
          },
        });
      });
      return;
    }

    // EDIT
    if (this.isEditMode && this.originalClaimId) {
      this.taxiService.updateTaxiClaim(this.originalClaimId, formData).subscribe({
        next: () => {
          this.toastService.success('แก้ไขรายการเบิกเรียบร้อยแล้ว');
          this.onClose.emit();
        },
        error: (error) => {
          this.toastService.warning(error.error.message);
        },
      });
      return;
    }

    // CREATE
    if (!this.isEditMode && selectedItems.length === 0) {
      this.swalService.warning('กรุณาเลือกวันที่ต้องการดำเนินการเบิก');
    } else {
      // Create
      this.taxiService.createTaxiClaim(formData).subscribe({
        next: () => {
          this.toastService.success('สร้างรายการเบิกเรียบร้อยแล้ว');
          this.onClose.emit();
        },
        error: (error) => {
          // this.swalService.warning(error.error.message)
          this.toastService.warning(error.error.message);
        },
      });
    }
  }

  private getInvalidFieldId(rowIndex: number, item: TaxiLogItem): string {
    const pick = (desktopId: string, mobileId: string) => {
      const desktop = document.getElementById(desktopId);
      return desktop && desktop.offsetParent !== null ? desktopId : mobileId;
    };

    if (!item.description?.trim()) return pick(`desc-${rowIndex}`, `mob-desc-${rowIndex}`);
    if (!item.locationFromId) return pick(`loc-from-${rowIndex}`, `mob-loc-from-${rowIndex}`);
    if (!item.locationToId) return pick(`loc-to-${rowIndex}`, `mob-loc-to-${rowIndex}`);
    if (this.isOtherLocation(item.locationFromId) && !item.otherFrom?.trim())
      return pick(`other-from-${rowIndex}`, `mob-other-from-${rowIndex}`);
    if (this.isOtherLocation(item.locationToId) && !item.otherTo?.trim())
      return pick(`other-to-${rowIndex}`, `mob-other-to-${rowIndex}`);

    return pick(`amount-${rowIndex}`, `mob-amount-${rowIndex}`);
  }

  cancel() {
    this.onClose.emit();
  }

  // Validate
  isItemValid(item: any): boolean {
    if (!item.description?.trim()) return false;

    if (!item.locationFromId || !item.locationToId) return false;

    if (this.isOtherLocation(item.locationFromId) && !item.otherFrom?.trim()) return false;

    if (this.isOtherLocation(item.locationToId) && !item.otherTo?.trim()) return false;

    if (!item.amount || item.amount <= 0) return false;

    if (item.amount > item.remainingAmount) return false;

    return true;
  }

  areAllItemsValid(): boolean {
    return this.items.filter((item) => item.selected).every((item) => this.isItemValid(item));
  }

  isKeep(): number {
    const selectedLogs = this.items.filter((item) => item.selected);
    return selectedLogs.length;
  }

  isDelete(): number {
    const selectedLogs = this.items.filter((item) => !item.selected);
    return selectedLogs.length;
  }

  totalClaims(): string {
    const selectedLogs = this.items.filter((item) => item.selected);
    const total = selectedLogs.reduce((sum, item) => sum + (item.amount || 0), 0);
    return total.toLocaleString('en-US') + '.-';
  }

  hasDelete(): boolean {
    const selectedLogs = this.items.filter((item) => item.selected);
    if (selectedLogs.length === 0) {
      return true;
    }
    return false;
  }
}
