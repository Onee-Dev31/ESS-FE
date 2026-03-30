import { Component, EventEmitter, OnInit, OnChanges, AfterViewChecked, Output, Input, inject, ChangeDetectorRef, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { FileUploadModal, FileSaveResult } from '../../modals/file-upload-modal/file-upload-modal';
import { TaxiService, TaxiLogItem, TaxiLocation } from '../../../services/taxi.service';
import { ExistingAttachment } from '../../../interfaces/taxi.interface';
import { ToastService } from '../../../services/toast';
import { DateUtilityService } from '../../../services/date-utility.service';
import { MasterDataService } from '../../../services/master-data.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-vehicle-taxi-form',
  standalone: true,
  imports: [CommonModule, FormsModule, FileUploadModal],
  templateUrl: './vehicle-taxi-form.html',
  styleUrl: './vehicle-taxi-form.scss'
})
export class VehicleTaxiFormComponent implements OnInit, OnChanges, AfterViewChecked {

  @Input() requestId: string = '';
  @Input() claimId?: number;                 // สำหรับ Edit Mode

  @Output() onClose = new EventEmitter<void>();

  private taxiService = inject(TaxiService);
  private toastService = inject(ToastService);
  dateUtil = inject(DateUtilityService);
  private cdr = inject(ChangeDetectorRef);
  private masterDataService = inject(MasterDataService);
  private authService = inject(AuthService);

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
    this.masterDataService.getDateConfig().subscribe(config => {
      this.thaiMonths = config.months;
      this.years = config.years;
    });

    this.taxiService.getLocations().subscribe({
      next: (res: any) => {
        this.locations = res.data ?? [];
        this.checkAndLoadData();
      },
      error: () => this.toastService.error('ไม่สามารถโหลดข้อมูลสถานที่ได้')
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['claimId'] || changes['requestId']) {
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
    if (this.claimId && this.claimId > 0) {
      this.isEditMode = true;
      this.originalClaimId = this.claimId;
      this.loadClaimForEdit(this.claimId);
    } else {
      this.isEditMode = false;
      this.loadEligibleDates();
    }
  }

  // ====================== EDIT MODE ======================
  private loadClaimForEdit(claimId: number) {
    this.isLoading = true;
    this.items = [];

    const empCode = this.authService.userData().CODEMPID;
    this.taxiService.getTaxiClaim(claimId, empCode).subscribe({
      next: (res: any) => {
        // response คือ { data: [...], pagination: {...} } — เอา element แรก
        const dataArr = Array.isArray(res.data) ? res.data : [res.data ?? res];
        const claim = dataArr[0];

        if (!claim) {
          this.toastService.error('ไม่พบรายการเบิกนี้');
          this.isLoading = false;
          this.onClose.emit();
          return;
        }

        this.items = (claim.details || claim.Details || []).map((d: any) => ({
          date: d.work_date || d.workDate,
          description: d.description || '',
          destination: '',                    // เพิ่มเพื่อให้ตรงกับ interface
          distance: 0,                        // เพิ่มเพื่อให้ตรงกับ interface
          locationFromId: d.location_from_id || d.locationFromId,
          locationToId: d.location_to_id || d.locationToId,
          otherFrom: d.other_from || d.otherFrom || '',
          otherTo: d.other_to || d.otherTo || '',
          amount: Number(d.rate_amount || d.amount || 0),
          shiftCode: d.shift_code || d.shiftCode || '',
          selected: true,
          attachedFile: null,
          filesToUpload: [],
          existingAttachments: (d.attachments || []).map((a: any): ExistingAttachment => ({
            attachmentId: a.attachment_id ?? a.attachmentId,
            fileName: a.file_name ?? a.fileName ?? '',
            fileUrl: a.file_url ?? a.fileUrl,
            filePath: a.file_path ?? a.filePath,
            fileType: a.file_type ?? a.fileType,
            fileSize: a.file_size ?? a.fileSize,
          })),
          checkIn: d.check_in || d.checkIn,
          checkOut: d.check_out || d.checkOut,
          dayType: d.day_type || d.dayType,
          remainingAmount: 0,
        } as TaxiLogItem));

        // ตั้งค่าเดือน-ปี จากข้อมูล claim
        if (this.items.length > 0) {
          const firstDate = new Date(this.items[0].date);
          this.selectedMonthIndex = firstDate.getMonth();
          this.selectedYear = firstDate.getFullYear() + 543;

          // ดึง shift info + remaining amount จาก eligible dates แล้ว merge
          const month = firstDate.getMonth() + 1;
          const year = firstDate.getFullYear() + 543;
          this.taxiService.getEligibleDates(empCode, year, month).subscribe({
            next: (eligRes: any) => {
              const eligRows: any[] = eligRes.data ?? [];
              this.items = this.items.map(item => {
                const elig = eligRows.find(r =>
                  (r.work_date ?? r.workDate ?? '').substring(0, 10) === item.date?.substring(0, 10)
                );
                if (!elig) return item;
                return {
                  ...item,
                  shiftCode: elig.shift_code ?? elig.shiftCode ?? item.shiftCode,
                  checkIn: elig.time_in ?? elig.timeIn ?? item.checkIn,
                  checkOut: elig.time_out ?? elig.timeOut ?? item.checkOut,
                  dayType: elig.day_type ?? elig.dayType ?? item.dayType,
                  remainingAmount: elig.remaining_amount ?? elig.remainingAmount ?? 0,
                };
              });
              this.isLoading = false;
              this.cdr.markForCheck();
            },
            error: () => {
              // ถ้าโหลด eligible dates ไม่ได้ก็แสดงข้อมูล claim เดิมได้เลย
              this.isLoading = false;
              this.cdr.markForCheck();
            }
          });
        } else {
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      },
      error: (err: any) => {
        console.error(err);
        this.isLoading = false;
        this.toastService.error('ไม่สามารถโหลดข้อมูลการเบิกเพื่อแก้ไขได้');
        this.onClose.emit();
      }
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
        console.log(res)
        const rows: any[] = res.data ?? [];
        this.items = rows.map((row: any) => ({
          date: row.workDate ?? row.work_date,
          description: '',
          destination: '',
          distance: 0,
          amount: 0,
          shiftCode: row.shiftCode ?? row.shift_code,
          selected: false,
          attachedFile: null,
          filesToUpload: [],
          existingAttachments: [],
          checkIn: row.timeIn ?? row.time_in,
          checkOut: row.timeOut ?? row.time_out,
          dayType: row.dayType ?? row.day_type,
          remainingAmount: row.remainingAmount ?? row.remaining_amount ?? 500,
          locationFromId: undefined,
          locationToId: undefined,
          otherFrom: '',
          otherTo: '',
        } as TaxiLogItem));

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.toastService.error('ไม่สามารถโหลดข้อมูลวันที่ได้');
        this.cdr.markForCheck();
      }
    });
  }

  // ====================== Helper Methods ======================
  isOtherLocation(locationId: number | undefined): boolean {
    if (!locationId) return false;
    const loc = this.locations.find(l => l.location_id === locationId);
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
      const office = this.locations.find(l => l.is_office);
      if (office) {
        item.locationToId = office.location_id;
        item.otherTo = '';
      }

      this.pendingFocusId = `other-from-${rowIndex}`;
      return;
    }

    // 👉 ถ้า from เป็น office → to เป็น other
    const other = this.locations.find(l => !l.is_office);
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
      const office = this.locations.find(l => l.is_office);
      if (office) {
        item.locationFromId = office.location_id;
        item.otherFrom = '';
      }

      this.pendingFocusId = `other-to-${rowIndex}`;
      return;
    }

    // 👉 ถ้า to เป็น office → from เป็น other
    const other = this.locations.find(l => !l.is_office);
    if (other) {
      item.locationFromId = other.location_id;
    }

    this.pendingFocusId = `other-from-${rowIndex}`;
  }

  onInputChange(item: TaxiLogItem) {
    if (item.description?.trim() || item.locationFromId || item.locationToId || (item.amount && item.amount > 0)) {
      item.selected = true;
    }
  }

  parseNumber(value: string | number): number {
    if (typeof value === 'number') return value;
    return Number(value.replace(/,/g, ""));
  }

  formatNumber(value: number): string {
    return value.toLocaleString("en-US");
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
    return this.items.filter(item => item.selected).length;
  }

  getTotalAmount(): number {
    return this.items
      .filter(item => item.selected)
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }

  openUploadModal(item: TaxiLogItem) {
    this.currentUploadItem = item;
    this.isShowUploadModal = true;
  }

  closeUploadModal() {
    this.isShowUploadModal = false;
    this.currentUploadItem = null;
  }

  handleFileSave(result: FileSaveResult) {
    if (this.currentUploadItem) {
      this.currentUploadItem.filesToUpload = result.newFiles;
      this.currentUploadItem.existingAttachments = result.keptAttachments;
      this.currentUploadItem.attachedFile = result.newFiles[0]?.name ?? null;
      if (result.newFiles.length > 0 || result.keptAttachments.length > 0) {
        this.currentUploadItem.selected = true;
      }
    }
    this.closeUploadModal();
  }

  // ====================== SAVE ======================
  save() {
    const selectedItems = this.items.filter(item => item.selected);

    if (selectedItems.length === 0) {
      this.toastService.warning('กรุณาเลือกรายการที่ต้องการเบิก');
      return;
    }

    const invalidItem = selectedItems.find(item =>
      !item.description?.trim() ||
      !item.locationFromId ||
      !item.locationToId ||
      (this.isOtherLocation(item.locationFromId) && !item.otherFrom?.trim()) ||
      (this.isOtherLocation(item.locationToId) && !item.otherTo?.trim()) ||
      !item.amount || item.amount <= 0
    );

    if (invalidItem) {
      const rowIndex = this.items.indexOf(invalidItem);
      const fieldId = this.getInvalidFieldId(rowIndex, invalidItem);

      const row = document.getElementById(`taxi-row-${rowIndex}`) ?? document.getElementById(`taxi-card-${rowIndex}`);
      row?.scrollIntoView({ behavior: 'instant', block: 'center' });

      const el = document.getElementById(fieldId) as HTMLElement | null;
      if (el) {
        el.focus();
        if (el instanceof HTMLInputElement) el.select();
        if (el instanceof HTMLSelectElement) {
          try { el.showPicker(); } catch { el.click(); }
        }
      }

      this.toastService.warning(`กรุณากรอกข้อมูลให้ครบถ้วนในรายการวันที่ ${this.dateUtil.formatDateToBE(invalidItem.date, 'DD/MM/YYYY')}`);
      return;
    }

    const empCode = this.authService.userData().CODEMPID;
    const details = selectedItems.map(item => ({
      work_date: item.date.split('T')[0],
      description: item.description,
      location_from_id: item.locationFromId ?? 0,
      location_to_id: item.locationToId ?? 0,
      other_from: item.otherFrom ?? '',
      other_to: item.otherTo ?? '',
      rate_amount: Number(item.amount),
    }));

    const files: File[] = [];
    const detailIndexes: number[] = [];

    selectedItems.forEach((item, index) => {
      (item.filesToUpload ?? []).forEach(file => {
        files.push(file);
        detailIndexes.push(index);
      });
    });

    const keptAttachments = selectedItems.flatMap((item, index) =>
      (item.existingAttachments ?? []).map(a => ({
        detail_index: index,
        attachment_id: a.attachmentId,
        file_name: a.fileName,
        file_path: a.filePath,
        file_url: a.fileUrl,
        file_type: a.fileType,
        file_size: a.fileSize,
      }))
    );

    if (this.isEditMode && this.originalClaimId) {
      // Update
      this.taxiService.updateTaxiClaim(this.originalClaimId, empCode, details, files, detailIndexes, keptAttachments)
        .subscribe({
          next: () => {
            this.toastService.success('แก้ไขรายการเบิกเรียบร้อยแล้ว');
            this.onClose.emit();
          },
          error: () => this.toastService.error('ไม่สามารถแก้ไขข้อมูลได้')
        });
    } else {
      // Create
      this.taxiService.createTaxiClaim(empCode, details, files, detailIndexes)
        .subscribe({
          next: () => {
            this.toastService.success('สร้างรายการเบิกเรียบร้อยแล้ว');
            this.onClose.emit();
          },
          error: () => this.toastService.error('ไม่สามารถบันทึกข้อมูลได้')
        });
    }
  }

  private getInvalidFieldId(rowIndex: number, item: TaxiLogItem): string {
    const pick = (desktopId: string, mobileId: string) => {
      const desktop = document.getElementById(desktopId);
      return (desktop && desktop.offsetParent !== null) ? desktopId : mobileId;
    };

    if (!item.description?.trim()) return pick(`desc-${rowIndex}`, `mob-desc-${rowIndex}`);
    if (!item.locationFromId) return pick(`loc-from-${rowIndex}`, `mob-loc-from-${rowIndex}`);
    if (!item.locationToId) return pick(`loc-to-${rowIndex}`, `mob-loc-to-${rowIndex}`);
    if (this.isOtherLocation(item.locationFromId) && !item.otherFrom?.trim()) return pick(`other-from-${rowIndex}`, `mob-other-from-${rowIndex}`);
    if (this.isOtherLocation(item.locationToId) && !item.otherTo?.trim()) return pick(`other-to-${rowIndex}`, `mob-other-to-${rowIndex}`);

    return pick(`amount-${rowIndex}`, `mob-amount-${rowIndex}`);
  }

  cancel() {
    this.onClose.emit();
  }
}