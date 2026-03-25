import { Component, Input, Output, EventEmitter, signal, OnInit, OnDestroy, inject, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MedicalexpensesService } from '../../../services/medicalexpenses.service';
import { AuthService } from '../../../services/auth.service';
import { MedicalExpenseTypeWithBalance } from '../../../interfaces/medical.interface';
import { ToastService } from '../../../services/toast';
import { DateUtilityService } from '../../../services/date-utility.service';
import { DialogService } from '../../../services/dialog';
import { FilePreviewModalComponent, FilePreviewItem } from '../../modals/file-preview-modal/file-preview-modal';
import dayjs from 'dayjs';
import { Subject, Subscription, debounceTime, switchMap, catchError, of } from 'rxjs';

import { ClaimType } from '../../../services/master-data.service';
import { MedicalApiService } from '../../../services/medical-api.service';
import { Hospital, DiseaseType } from '../../../interfaces/medical.interface';

@Component({
  selector: 'app-medicalexpenses-form',
  standalone: true,
  imports: [CommonModule, FormsModule, FilePreviewModalComponent],
  templateUrl: './medicalexpenses-form.html',
  styleUrl: './medicalexpenses-form.scss',
})
export class MedicalexpensesForm implements OnInit, OnDestroy {
  private medicalService = inject(MedicalexpensesService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private dateUtil = inject(DateUtilityService);
  private medicalApiService = inject(MedicalApiService);
  private dialogService = inject(DialogService);


  @Input() requestId: string = '';
  @Output() onClose = new EventEmitter<void>();

  currentDate = signal<string>('');
  employeeId = signal<string>('');
  isEditMode = signal<boolean>(false);
  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  claimTypes: ClaimType[] = [];
  private expenseTypesRaw: MedicalExpenseTypeWithBalance[] = [];

  selectedClaimType = signal<string>('');
  claimTypeHighlight = signal<boolean>(false);
  amountHighlight = signal<boolean>(false);
  hospitalHighlight = signal<boolean>(false);
  diseaseHighlight = signal<boolean>(false);

  hospital = signal<string>('');
  selectedHospitalObj = signal<Hospital | null>(null);
  hospitalDropdown = signal<Hospital[]>([]);
  isHospitalDropdownOpen = signal<boolean>(false);
  isHospitalLoading = signal<boolean>(false);
  isHospitalLoadingMore = signal<boolean>(false);

  private currentKeyword = '';
  private currentPage = 1;
  private hasNextPage = false;
  private readonly PAGE_SIZE = 20;

  @ViewChild('claimTypeSection') claimTypeSectionEl?: ElementRef<HTMLElement>;
  @ViewChild('amountInput') amountInputEl?: ElementRef<HTMLInputElement>;
  @ViewChild('hospitalInput') hospitalInputEl?: ElementRef<HTMLInputElement>;
  @ViewChild('diseaseInput') diseaseInputEl?: ElementRef<HTMLInputElement>;
  @ViewChild('hospitalDropdownEl') hospitalDropdownEl?: ElementRef<HTMLDivElement>;

  private hospitalSearch$ = new Subject<string>();
  private searchSub?: Subscription;

  // Disease autocomplete
  disease = signal<string>('');
  selectedDiseaseObj = signal<DiseaseType | null>(null);
  diseaseDropdown = signal<DiseaseType[]>([]);
  isDiseaseDropdownOpen = signal<boolean>(false);
  isDiseaseLoading = signal<boolean>(false);
  isDiseaseLoadingMore = signal<boolean>(false);

  private diseaseKeyword = '';
  private diseasePage = 1;
  private diseaseHasNext = false;

  @ViewChild('diseaseDropdownEl') diseaseDropdownEl?: ElementRef<HTMLDivElement>;

  private diseaseSearch$ = new Subject<string>();
  private diseaseSearchSub?: Subscription;
  startDate = signal<string>('');
  endDate = signal<string>('');
  amount = signal<string>('');
  amountError: string | null = null;
  // amount = signal<number>(0);
  // amount: number = 0;

  totalDays = computed(() => {
    if (!this.startDate() || !this.endDate()) return 0;
    const start = dayjs(this.startDate());
    const end = dayjs(this.endDate());
    const diff = end.diff(start, 'day') + 1;
    return diff > 0 ? diff : 0;
  });

  attachments = signal<{ id: number; name: string; description: string; file?: File }[]>([]);
  isSaving = signal<boolean>(false);

  calculatedDays = computed(() => {
    if (!this.startDate() || !this.endDate()) return 0;
    const start = dayjs(this.startDate());
    const end = dayjs(this.endDate());
    if (end.isBefore(start)) return 0;
    return end.diff(start, 'day') + 1;
  });

  private mapExpenseType(type: MedicalExpenseTypeWithBalance): ClaimType {
    const iconMap: Record<string, string> = {
      stethoscope: 'fas fa-stethoscope',
      bed: 'fas fa-bed',
      tooth: 'fas fa-tooth',
      glasses: 'fas fa-glasses'
    };
    const colorMap: Record<string, string> = {
      OPD: 'var(--danger)',
      IPD: 'var(--success)',
      DENTAL: 'var(--primary)',
      VISION: 'var(--primary)'
    };
    const inpatientCodes = ['IPD'];
    return {
      id: type.code.toLowerCase(),
      label: type.nameTh,
      amount: type.remainingAmount.toLocaleString('th-TH'),
      icon: iconMap[type.icon ?? ''] ?? 'fas fa-medkit',
      color: colorMap[type.code] ?? 'var(--primary)',
      group: inpatientCodes.includes(type.code.toUpperCase()) ? 'inpatient' : 'outpatient'
    };
  }

  get outpatientTypes(): ClaimType[] {
    return this.claimTypes.filter(t => t.group === 'outpatient');
  }

  get inpatientTypes(): ClaimType[] {
    return this.claimTypes.filter(t => t.group === 'inpatient');
  }
  remark = signal<string>('');

  ngOnInit() {
    const employeeCode = this.authService.userData()?.CODEMPID ?? '';
    this.employeeId.set(employeeCode);

    const fiscalYear = dayjs().year();
    this.medicalApiService.getExpenseTypesWithBalance(employeeCode, fiscalYear).subscribe({
      next: (res) => {
        this.expenseTypesRaw = res.data;
        this.claimTypes = res.data.map(t => this.mapExpenseType(t));
        this.loadRequestData();
      },
      error: () => this.loadRequestData()
    });

    this.searchSub = this.hospitalSearch$.pipe(
      debounceTime(300),
      switchMap(keyword => {
        // reset pagination เมื่อ keyword เปลี่ยน
        this.currentKeyword = keyword;
        this.currentPage = 1;
        this.isHospitalLoading.set(true);
        return this.medicalApiService.searchHospitals(keyword || undefined, 1, this.PAGE_SIZE).pipe(
          catchError(() => {
            this.isHospitalLoading.set(false);
            return of({ success: false, data: [], pagination: undefined });
          })
        );
      })
    ).subscribe(res => {
      this.hospitalDropdown.set(res.data);
      this.hasNextPage = res.pagination?.hasNext ?? false;
      this.isHospitalDropdownOpen.set(res.data.length > 0);
      this.isHospitalLoading.set(false);
    });

    this.diseaseSearchSub = this.diseaseSearch$.pipe(
      debounceTime(300),
      switchMap(keyword => {
        this.diseaseKeyword = keyword;
        this.diseasePage = 1;
        this.isDiseaseLoading.set(true);
        return this.medicalApiService.searchDiseaseTypes(keyword || undefined, undefined, undefined, 1, this.PAGE_SIZE).pipe(
          catchError(() => {
            this.isDiseaseLoading.set(false);
            return of({ success: false, data: [], pagination: undefined });
          })
        );
      })
    ).subscribe(res => {
      this.diseaseDropdown.set(res.data);
      this.diseaseHasNext = res.pagination?.hasNext ?? false;
      this.isDiseaseDropdownOpen.set(res.data.length > 0);
      this.isDiseaseLoading.set(false);
    });
  }

  ngOnDestroy() {
    this.searchSub?.unsubscribe();
    this.diseaseSearchSub?.unsubscribe();
  }

  onHospitalInput(value: string) {
    this.hospital.set(value);
    this.selectedHospitalObj.set(null);
    this.hospitalSearch$.next(value);
  }

  onHospitalFocus() {
    if (this.hospitalDropdown().length > 0) {
      this.isHospitalDropdownOpen.set(true);
    } else {
      this.hospitalSearch$.next(this.hospital());
    }
  }

  onHospitalBlur() {
    setTimeout(() => this.isHospitalDropdownOpen.set(false), 200);
  }

  onDropdownScroll(event: Event) {
    const el = event.target as HTMLElement;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
    if (nearBottom && this.hasNextPage && !this.isHospitalLoadingMore()) {
      this.loadMoreHospitals();
    }
  }

  private loadMoreHospitals() {
    this.isHospitalLoadingMore.set(true);
    const nextPage = this.currentPage + 1;
    this.medicalApiService.searchHospitals(this.currentKeyword || undefined, nextPage, this.PAGE_SIZE)
      .pipe(catchError(() => of({ success: false, data: [], pagination: undefined })))
      .subscribe(res => {
        this.hospitalDropdown.update(current => [...current, ...res.data]);
        this.hasNextPage = res.pagination?.hasNext ?? false;
        this.currentPage = nextPage;
        this.isHospitalLoadingMore.set(false);
      });
  }

  selectHospital(h: Hospital) {
    this.hospital.set(h.nameTh);
    this.selectedHospitalObj.set(h);
    this.isHospitalDropdownOpen.set(false);
  }

  onDiseaseInput(value: string) {
    this.disease.set(value);
    this.selectedDiseaseObj.set(null);
    this.diseaseSearch$.next(value);
  }

  onDiseaseFocus() {
    if (this.diseaseDropdown().length > 0) {
      this.isDiseaseDropdownOpen.set(true);
    } else {
      this.diseaseSearch$.next(this.disease());
    }
  }

  onDiseaseBlur() {
    setTimeout(() => this.isDiseaseDropdownOpen.set(false), 200);
  }

  onDiseaseDropdownScroll(event: Event) {
    const el = event.target as HTMLElement;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
    if (nearBottom && this.diseaseHasNext && !this.isDiseaseLoadingMore()) {
      this.loadMoreDiseases();
    }
  }

  private loadMoreDiseases() {
    this.isDiseaseLoadingMore.set(true);
    const nextPage = this.diseasePage + 1;
    this.medicalApiService.searchDiseaseTypes(this.diseaseKeyword || undefined, undefined, undefined, nextPage, this.PAGE_SIZE)
      .pipe(catchError(() => of({ success: false, data: [], pagination: undefined })))
      .subscribe(res => {
        this.diseaseDropdown.update(current => [...current, ...res.data]);
        this.diseaseHasNext = res.pagination?.hasNext ?? false;
        this.diseasePage = nextPage;
        this.isDiseaseLoadingMore.set(false);
      });
  }

  selectDisease(d: DiseaseType) {
    this.disease.set(d.nameTh);
    this.selectedDiseaseObj.set(d);
    this.isDiseaseDropdownOpen.set(false);
  }

  loadRequestData() {
    if (this.requestId) {
      this.medicalService.getRequestById(this.requestId).subscribe(req => {
        if (req) {
          this.isEditMode.set(true);
          this.currentDate.set(this.dateUtil.formatDateToThaiMonth(req.createDate));

          if (req.items && req.items.length > 0) {
            const item = req.items[0];
            this.hospital.set(item.hospital);
            this.disease.set(item.diseaseType);

            const typeMatch = this.claimTypes.find(t => t.label === item.limitType);
            if (typeMatch) {
              this.selectedClaimType.set(typeMatch.id);
            }

            this.startDate.set(this.dateUtil.formatBEToISO(item.treatmentDateFrom));
            this.endDate.set(this.dateUtil.formatBEToISO(item.treatmentDateTo));
            this.amount.set(item.requestedAmount.toString());
            // this.amount = item.requestedAmount
          }
        } else {
          this.isEditMode.set(false);
          this.currentDate.set(this.dateUtil.formatDateToThaiMonth(dayjs().toDate()));
          this.resetDates();
        }
      });
    } else {
      this.currentDate.set(this.dateUtil.formatDateToThaiMonth(dayjs().toDate()));
      this.resetDates();
    }
  }

  private resetDates() {
    const today = this.dateUtil.getCurrentDateISO();
    this.startDate.set(today);
    this.endDate.set(today);
  }

  selectClaimType(id: string) {
    this.selectedClaimType.set(id);
  }

  deleteAttachment(id: number) {
    this.attachments.update(current => current.filter(a => a.id !== id));
  }

  triggerFileInput(input: HTMLInputElement) {
    input.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const currentAttachments = this.attachments();
      const newAttachments = Array.from(input.files).map((file: File, index) => ({
        id: currentAttachments.length + index + 1,
        name: file.name,
        description: '',
        file
      }));
      this.attachments.update(current => [...current, ...newAttachments]);
    }
    input.value = '';
  }

  close() {
    this.onClose.emit();
  }

  openPreview(file: { name: string }) {
    this.previewFiles.set([{
      fileName: file.name,
      date: this.currentDate()
    }]);
    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }

  async save() {
    if (!this.selectedClaimType()) {
      this.toastService.warning('กรุณาเลือกประเภทการเบิกก่อนดำเนินการต่อ');
      this.claimTypeSectionEl?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.claimTypeHighlight.set(true);
      setTimeout(() => this.claimTypeHighlight.set(false), 800);
      return;
    }

    if (!this.startDate() || !this.endDate()) {
      this.toastService.warning('กรุณาระบุวันที่รักษา');
      return;
    }

    if (!this.dateUtil.isValidDateRange(this.startDate(), this.endDate())) {
      this.toastService.warning('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด');
      return;
    }

    if (this.parseNumber(this.amount()) <= 0) {
      this.toastService.warning('จำนวนเงินที่เบิกต้องมากกว่า 0');
      this.amountInputEl?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.amountInputEl?.nativeElement.focus();
      this.amountHighlight.set(true);
      setTimeout(() => this.amountHighlight.set(false), 800);
      return;
    }

    const rawType = this.expenseTypesRaw.find(t => t.code.toLowerCase() === this.selectedClaimType());
    if (!rawType) {
      this.toastService.warning('ไม่พบข้อมูลประเภทการเบิก');
      return;
    }

    const hosp = this.selectedHospitalObj();
    if (!hosp) {
      this.toastService.warning('กรุณาเลือกสถานพยาบาลจากรายการ');
      this.hospitalInputEl?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.hospitalInputEl?.nativeElement.focus();
      this.hospitalHighlight.set(true);
      setTimeout(() => this.hospitalHighlight.set(false), 800);
      return;
    }

    const disease = this.selectedDiseaseObj();
    if (!disease) {
      this.toastService.warning('กรุณาเลือกประเภทโรคจากรายการ');
      this.diseaseInputEl?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.diseaseInputEl?.nativeElement.focus();
      this.diseaseHighlight.set(true);
      setTimeout(() => this.diseaseHighlight.set(false), 800);
      return;
    }

    const attachmentList = this.attachments();
    const files = attachmentList.map(a => a.file).filter((f): f is File => f != null);
    const fileRemarks = attachmentList.map(a => a.description);

    const confirmed = await this.dialogService.confirm({
      title: 'ยืนยันการส่งเรื่องเบิก',
      message: `ต้องการส่งเรื่องเบิกค่ารักษาพยาบาล <strong>${rawType.nameTh}</strong><br>จำนวน <strong>${this.parseNumber(this.amount()).toLocaleString('th-TH')} บาท</strong> ใช่หรือไม่?`,
      confirmText: 'ส่งเรื่องเบิก',
      cancelText: 'ยกเลิก',
      type: 'info',
    });

    if (!confirmed) return;

    this.isSaving.set(true);
    this.medicalApiService.submitClaim({
      employee_code: this.employeeId(),
      expense_type_id: rawType.typeId,
      hospital_id: hosp.hospitalId,
      disease_id: disease.diseaseId,
      treatment_date_from: this.startDate(),
      treatment_date_to: this.endDate(),
      treatment_days: this.calculatedDays(),
      requested_amount: this.parseNumber(this.amount()),
      remark: this.remark() || undefined,
      files: files.length > 0 ? files : undefined,
      file_remarks: fileRemarks.length > 0 ? fileRemarks : undefined,
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toastService.success('ส่งเรื่องเบิกเรียบร้อยแล้ว');
        this.close();
      },
      error: () => {
        this.isSaving.set(false);
        this.toastService.error('เกิดข้อผิดพลาดในการส่งเรื่อง');
      }
    });
  }


  // FUNCTION

  parseNumber(value: string | number): number {
    if (typeof value === 'number') return value; // already number
    return Number(value.replace(/,/g, ""));
  }
  formatNumber(value: number): string {
    return value.toLocaleString("en-US");
  }

  onAmountChange(value: string) {
    const selectedId = this.selectedClaimType();
    const claim = this.claimTypes.find(item => item.id === selectedId);
    const maxAmount = this.parseNumber(claim?.amount || 0);
    console.log(value, maxAmount, this.parseNumber(value) > maxAmount)

    if (this.parseNumber(value) > maxAmount) {
      this.amountError = `จำนวนเงินต้องไม่เกิน ${maxAmount.toLocaleString('en-US')} บาท`;
    } else {
      this.amountError = null; // ไม่มี error
    }


  }

  // onAmountChange(event: Event) {
  //   const input = event.target as HTMLInputElement;
  //   console.log(input)

  //   // แปลง string -> number (ลบ comma)
  //   let valueAmount = Number(input.value.replace(/,/g, ''));

  //   // หา maxAmount
  //   const selectedId = this.selectedClaimType();
  //   const claim = this.claimTypes.find(item => item.id === selectedId);
  //   const maxAmount = this.parseNumber(claim?.amount || 0);

  //   if (valueAmount >= maxAmount) {
  //     valueAmount = maxAmount;
  //   }

  //   this.amount = valueAmount;
  //   input.value = valueAmount.toLocaleString('en-US');
  // }
}
