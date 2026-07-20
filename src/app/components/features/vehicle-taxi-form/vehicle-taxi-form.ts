import {
  Component,
  EventEmitter,
  OnInit,
  OnChanges,
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
import { finalize } from 'rxjs';
import { mapTaxiClaimDetail, TaxiClaimDetailResponse } from '../../../interfaces/taxi.interface';

@Component({
  selector: 'app-vehicle-taxi-form',
  standalone: true,
  imports: [CommonModule, FormsModule, FileUploadModal],
  templateUrl: './vehicle-taxi-form.html',
  styleUrl: './vehicle-taxi-form.scss',
})
export class VehicleTaxiFormComponent implements OnInit, OnChanges {
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
  eligibleDates: TaxiLogItem[] = [];
  selectedEligibleDate = '';
  locations: TaxiLocation[] = [];

  thaiMonths: string[] = [];
  years: number[] = [];

  selectedMonthIndex: number = new Date().getMonth();
  selectedYear: number = new Date().getFullYear() + 543;

  isLoading = false;
  isSubmitting = false;
  isShowUploadModal: boolean = false;
  currentUploadItem: TaxiLogItem | null = null;

  isEditMode = false;
  originalClaimId?: number;
  originalDetailCount = 0;

  private clientIdSequence = 0;
  private locationsLoaded = false;
  private loadSequence = 0;

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
        this.locationsLoaded = true;
        this.checkAndLoadData();
      },
      error: () => this.toastService.error('ไม่สามารถโหลดข้อมูลสถานที่ได้'),
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['requests']) {
      // Inputs are available before the first template check. Establish the
      // complete view mode now so it never flips after the initial render.
      this.isEditMode = Boolean(this.requests);
      this.originalClaimId = this.requests?.claimId;
      this.isLoading = true;

      if (this.locationsLoaded) this.checkAndLoadData();
    }
  }

  private focusFieldAfterRender(id: string): void {
    setTimeout(() => {
      const desktop = document.getElementById(id) as HTMLInputElement | null;
      const mobile = document.getElementById(`mob-${id}`) as HTMLInputElement | null;
      const el = (desktop?.offsetParent !== null ? desktop : null) ?? mobile ?? desktop;

      if (el) {
        el.focus();
        if (el instanceof HTMLInputElement) el.select();
      }
    });
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
    const loadId = ++this.loadSequence;
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
        if (loadId !== this.loadSequence) return;
        const claim = res.data[0] || res;
        const originalTotalsByDate = new Map<string, number>();
        const claimDetails = ((claim.details ?? []) as TaxiClaimDetailResponse[]).map(
          mapTaxiClaimDetail,
        );
        claimDetails.forEach((detail) => {
          const date = this.toDateKey(detail.workDate);
          const amount = detail.rateAmount;
          originalTotalsByDate.set(date, (originalTotalsByDate.get(date) || 0) + amount);
        });

        const itemPromises = claimDetails.map(async (detail) => {
          const attachedFiles = detail.attachments.length
            ? await this.fileConvertService.convertUrlsToFiles(detail.attachments)
            : [];

          return {
            clientId: this.createClientId(),
            detailId: detail.detailId,
            date: detail.workDate,
            description: detail.description,
            destination: '',
            distance: 0,
            locationFromId: detail.locationFromId,
            locationToId: detail.locationToId,
            otherFrom: detail.otherFrom,
            otherTo: detail.otherTo,
            amount: detail.rateAmount,
            shiftCode: detail.shiftCode ?? '',
            selected: true,
            attachedFileNames: attachedFiles.map((file: File) => file.name),
            attachedFiles: attachedFiles,
            fileToUpload: null,
            checkIn: detail.timeIn ?? undefined,
            checkOut: detail.timeOut ?? undefined,
            dayType: detail.dayType ?? undefined,
            remainingAmount: detail.remainingAmount,
            usedAmount: detail.usedAmount,
            dailyLimit: detail.dailyLimit,
            availableAmount:
              detail.remainingAmount +
              (originalTotalsByDate.get(this.toDateKey(detail.workDate)) || 0),
            isEligible: true,
          };
        });

        Promise.all(itemPromises)
          .then((items) => {
            if (loadId !== this.loadSequence) return;
            // Promise callbacks may resolve between Angular's development-mode
            // verification passes. Commit the complete snapshot on the next task.
            setTimeout(() => {
              if (loadId !== this.loadSequence) return;
              this.items = items;
              this.originalDetailCount = items.length;

              if (this.items.length > 0) {
                const [year, month] = this.items[0].date.split('-').map(Number);
                this.selectedMonthIndex = month - 1;
                this.selectedYear = year + 543;
              }

              this.isLoading = false;
              this.cdr.markForCheck();
            });
          })
          .catch((error) => {
            if (loadId !== this.loadSequence) return;
            console.error(error);
            this.isLoading = false;
            this.toastService.error('ไม่สามารถโหลดไฟล์แนบของรายการเบิกได้');
            this.onClose.emit();
          });
      },
      error: (err: any) => {
        if (loadId !== this.loadSequence) return;
        console.error(err);
        this.isLoading = false;
        this.toastService.error('ไม่สามารถโหลดข้อมูลการเบิกเพื่อแก้ไขได้');
        this.onClose.emit();
      },
    });
  }

  // ====================== CREATE MODE ======================
  loadEligibleDates() {
    const loadId = ++this.loadSequence;
    const empCode = this.authService.userData().CODEMPID;
    const month = this.selectedMonthIndex + 1;

    this.isLoading = true;
    this.items = [];
    this.eligibleDates = [];
    this.selectedEligibleDate = '';

    this.taxiService.getEligibleDates(empCode, this.selectedYear, month).subscribe({
      next: (res: any) => {
        if (loadId !== this.loadSequence) return;
        const rows: any[] = res.data ?? [];
        this.eligibleDates = rows.map(
          (row: any) =>
            ({
              date: row.workDate ?? row.work_date,
              clientId: this.createClientId(),
              description: '',
              destination: '',
              distance: 0,
              amount: 0,
              shiftCode: row.shiftCode ?? row.shift_code,
              selected: false,
              attachedFileNames: [],
              attachedFile: null,
              fileToUpload: null,
              checkIn: row.timeIn ?? row.time_in,
              checkOut: row.timeOut ?? row.time_out,
              dayType: row.dayType ?? row.day_type,
              remainingAmount: row.remainingAmount ?? row.remaining_amount ?? 500,
              usedAmount: Number(row.usedAmount ?? row.used_amount ?? 0),
              dailyLimit: Number(
                row.dailyLimit ??
                  row.daily_limit ??
                  (row.remainingAmount ?? row.remaining_amount ?? 500) +
                    (row.usedAmount ?? row.used_amount ?? 0),
              ),
              availableAmount: Number(row.remainingAmount ?? row.remaining_amount ?? 500),
              isEligible: ![false, 0, '0'].includes(row.isEligible ?? row.is_eligible ?? true),
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
        if (loadId !== this.loadSequence) return;
        this.isLoading = false;
        this.toastService.error('ไม่สามารถโหลดข้อมูลวันที่ได้');
        this.cdr.markForCheck();
      },
    });
  }

  // ====================== Helper Methods ======================
  private createClientId(): string {
    this.clientIdSequence += 1;
    return `taxi-trip-${Date.now()}-${this.clientIdSequence}`;
  }

  private toDateKey(date: string): string {
    return date?.split('T')[0] || '';
  }

  trackByClientId(_index: number, item: TaxiLogItem): string | number {
    return item.detailId ?? item.clientId;
  }

  addSelectedDate(): void {
    const selectedDate = this.eligibleDates.find(
      (item) => this.toDateKey(item.date) === this.selectedEligibleDate,
    );
    if (!selectedDate || !this.canAddTrip(selectedDate)) return;
    this.addTrip(selectedDate);
  }

  getTripsForDate(item: TaxiLogItem): TaxiLogItem[] {
    const date = this.toDateKey(item.date);
    return this.items.filter((candidate) => this.toDateKey(candidate.date) === date);
  }

  getTripNumber(item: TaxiLogItem): number {
    return (
      this.getTripsForDate(item).findIndex((candidate) => candidate.clientId === item.clientId) + 1
    );
  }

  addTrip(source: TaxiLogItem): void {
    const trip: TaxiLogItem = {
      ...source,
      clientId: this.createClientId(),
      detailId: undefined,
      description: '',
      amount: 0,
      selected: true,
      locationFromId: undefined,
      locationToId: undefined,
      otherFrom: '',
      otherTo: '',
      attachedFile: null,
      attachedFileNames: [],
      attachedFiles: [],
      existingFiles: [],
      fileToUpload: null,
      amountError: null,
    };
    const lastIndexForDate = this.items.reduce(
      (lastIndex, item, index) =>
        this.toDateKey(item.date) === this.toDateKey(source.date) ? index : lastIndex,
      -1,
    );
    this.items.splice(lastIndexForDate + 1, 0, trip);
  }

  removeTrip(item: TaxiLogItem): void {
    const sameDateTrips = this.getTripsForDate(item);
    if (!this.isEditMode && sameDateTrips.length === 1) {
      Object.assign(item, {
        description: '',
        amount: 0,
        selected: false,
        locationFromId: undefined,
        locationToId: undefined,
        otherFrom: '',
        otherTo: '',
        attachedFileNames: [],
        attachedFiles: [],
        amountError: null,
      });
      return;
    }
    this.items = this.items.filter((candidate) => candidate.clientId !== item.clientId);
  }

  getAvailableAmount(item: TaxiLogItem): number {
    return Number(item.availableAmount ?? item.remainingAmount ?? 0);
  }

  getDailySelectedTotal(item: TaxiLogItem): number {
    const date = this.toDateKey(item.date);
    return this.items
      .filter((candidate) => candidate.selected && this.toDateKey(candidate.date) === date)
      .reduce((total, candidate) => total + (Number(candidate.amount) || 0), 0);
  }

  getDailyAmountError(item: TaxiLogItem): string | null {
    const total = this.getDailySelectedTotal(item);
    const available = this.getAvailableAmount(item);
    return total > available
      ? `ยอดรวมของวันนี้ ${this.formatNumber(total)} บาท เกินวงเงินที่ใช้ได้ ${this.formatNumber(available)} บาท`
      : null;
  }

  getEligibilityText(item: TaxiLogItem): string {
    if (item.isEligible === false || this.getAvailableAmount(item) <= 0) return 'ใช้วงเงินครบแล้ว';
    const used = Number(item.usedAmount || 0);
    const limit = Number(item.dailyLimit || used + Number(item.remainingAmount || 0));
    return `ใช้แล้ว ${this.formatNumber(used)} / ${this.formatNumber(limit)} บาท — คงเหลือ ${this.formatNumber(Number(item.remainingAmount || 0))} บาท`;
  }

  getShiftTimeLabel(item: TaxiLogItem): string {
    const shiftCode = item.shiftCode?.trim();
    const checkIn = item.checkIn?.trim();
    const checkOut = item.checkOut?.trim();

    if (!shiftCode && !checkIn && !checkOut) return 'ไม่มีข้อมูลกะ';

    const shiftLabel = shiftCode ? `กะ ${shiftCode}` : '';
    const timeRange = checkIn || checkOut ? `${checkIn || '-'} - ${checkOut || '-'}` : '';
    return [shiftLabel, timeRange].filter(Boolean).join(' — ');
  }

  dayTypeLabel(code: string | undefined): string {
    const labels: Record<string, string> = {
      W: 'วันทำงานปกติ',
      H: 'วันหยุด',
      T: 'วันหยุดประเพณี',
      L: 'วันลา',
    };
    return code ? (labels[code] ?? code) : '-';
  }

  canAddTrip(item: TaxiLogItem): boolean {
    return item.isEligible !== false && this.getAvailableAmount(item) > 0;
  }

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

      this.focusFieldAfterRender(`other-from-${rowIndex}`);
      return;
    }

    // 👉 ถ้า from เป็น office → to เป็น other
    const other = this.locations.find((l) => !l.is_office);
    if (other) {
      item.locationToId = other.location_id;
    }

    this.focusFieldAfterRender(`other-to-${rowIndex}`);
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

      this.focusFieldAfterRender(`other-to-${rowIndex}`);
      return;
    }

    // 👉 ถ้า to เป็น office → from เป็น other
    const other = this.locations.find((l) => !l.is_office);
    if (other) {
      item.locationFromId = other.location_id;
    }

    this.focusFieldAfterRender(`other-from-${rowIndex}`);
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
    const value = input.value.replace(/[^0-9]/g, '');

    const numericValue = Number(value || 0);

    item.amount = numericValue;
    item.amountError = this.getDailyAmountError(item);

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
    if (this.isSubmitting) return;

    const selectedItems = this.items.filter((item) => item.selected);
    const empCode = this.authService.userData().CODEMPID;
    const details = selectedItems.map((item) => {
      const detail = {
        work_date: this.toDateKey(item.date),
        description: item.description ?? '',
        location_from_id: item.locationFromId ?? 0,
        location_to_id: item.locationToId ?? 0,
        other_from: item.otherFrom ?? '',
        other_to: item.otherTo ?? '',
        rate_amount: Number(item.amount) || 0,
      } as Record<string, string | number>;
      if (this.isEditMode && item.detailId != null) detail['detail_id'] = item.detailId;
      return detail;
    });

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
        this.isSubmitting = true;

        this.taxiService
          .deleteTaxiClaim(this.requests.id, empCode)
          .pipe(finalize(() => (this.isSubmitting = false)))
          .subscribe({
            next: (res) => {
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
      this.isSubmitting = true;
      this.taxiService
        .updateTaxiClaim(this.originalClaimId, formData)
        .pipe(finalize(() => (this.isSubmitting = false)))
        .subscribe({
          next: () => {
            this.toastService.success('แก้ไขรายการเบิกเรียบร้อยแล้ว');
            this.onClose.emit();
          },
          error: (error) => {
            this.toastService.warning(this.getApiErrorMessage(error));
          },
        });
      return;
    }

    // CREATE
    if (!this.isEditMode && selectedItems.length === 0) {
      this.swalService.warning('กรุณาเลือกวันที่ต้องการดำเนินการเบิก');
    } else {
      // Create
      this.isSubmitting = true;
      this.taxiService
        .createTaxiClaim(formData)
        .pipe(finalize(() => (this.isSubmitting = false)))
        .subscribe({
          next: () => {
            this.toastService.success('สร้างรายการเบิกเรียบร้อยแล้ว');
            this.onClose.emit();
          },
          error: (error) => {
            this.toastService.warning(this.getApiErrorMessage(error));
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
  private getApiErrorMessage(error: any): string {
    return (
      error?.error?.message ||
      error?.response?.data?.message ||
      error?.message ||
      'ไม่สามารถบันทึกข้อมูลได้'
    );
  }

  isItemValid(item: any): boolean {
    if (!this.toDateKey(item.date)) return false;

    if (item.isEligible === false && !this.isEditMode) return false;

    if (!item.description?.trim()) return false;

    if (!item.locationFromId || !item.locationToId) return false;

    const from = this.locations.find((location) => location.location_id === item.locationFromId);
    const to = this.locations.find((location) => location.location_id === item.locationToId);
    if (!from?.is_office && !to?.is_office) return false;

    if (this.isOtherLocation(item.locationFromId) && !item.otherFrom?.trim()) return false;

    if (this.isOtherLocation(item.locationToId) && !item.otherTo?.trim()) return false;

    if (!item.amount || item.amount <= 0) return false;

    if (this.getDailyAmountError(item)) return false;

    return true;
  }

  areAllItemsValid(): boolean {
    const selectedItems = this.items.filter((item) => item.selected);
    return selectedItems.length > 0 && selectedItems.every((item) => this.isItemValid(item));
  }

  isSubmitDisabled(): boolean {
    if (this.isSubmitting) return true;
    if (this.isEditMode && this.hasDelete()) return false;
    return !this.areAllItemsValid();
  }

  isKeep(): number {
    const selectedLogs = this.items.filter((item) => item.selected);
    return selectedLogs.length;
  }

  isDelete(): number {
    if (this.isEditMode) {
      const keptExistingItems = this.items.filter((item) => item.selected && item.detailId != null);
      return Math.max(0, this.originalDetailCount - keptExistingItems.length);
    }
    return this.items.filter((item) => !item.selected).length;
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
