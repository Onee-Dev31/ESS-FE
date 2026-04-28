import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  OnInit,
  OnDestroy,
  inject,
  computed,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { MedicalExpenseTypeWithBalance } from '../../../interfaces/medical.interface';
import { ToastService } from '../../../services/toast';
import { DateUtilityService } from '../../../services/date-utility.service';
import { DialogService } from '../../../services/dialog';
import {
  FilePreviewModalComponent,
  FilePreviewItem,
} from '../../modals/file-preview-modal/file-preview-modal';
import dayjs from 'dayjs';
import { Subject, Subscription, debounceTime, switchMap, catchError, of } from 'rxjs';

import { ClaimType } from '../../../services/master-data.service';
import { MedicalService } from '../../../services/medical.service';
import { Hospital, DiseaseType } from '../../../interfaces/medical.interface';
import { formatMoneyInput } from '../../../utils/formatText';
import { SwalService } from '../../../services/swal.service';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';

@Component({
  selector: 'app-medicalexpenses-form',
  standalone: true,
  imports: [CommonModule, FormsModule, FilePreviewModalComponent, NzDatePickerModule],
  templateUrl: './medicalexpenses-form.html',
  styleUrl: './medicalexpenses-form.scss',
})
export class MedicalexpensesForm implements OnInit, OnDestroy {
  private static readonly PROBATION_DAYS = 119;

  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private dateUtil = inject(DateUtilityService);
  private medicalService = inject(MedicalService);
  private dialogService = inject(DialogService);
  private swalService = inject(SwalService);

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
  // amount = signal<string>('');
  amount: string = '';
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

  attachments = signal<
    { id: number; attachmentId?: number; name: string; description: string; file?: File }[]
  >([]);
  removedAttachmentIds = signal<number[]>([]);
  isSaving = signal<boolean>(false);

  private probationEligibility = computed<'passed' | 'not_passed' | 'unknown'>(() => {
    const employee = this.authService.userData();
    const allData = this.authService.allData();
    return this.resolveProbationEligibility(employee, allData);
  });

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
      glasses: 'fas fa-glasses',
    };
    const colorMap: Record<string, string> = {
      OPD: 'var(--danger)',
      IPD: 'var(--success)',
      DENTAL: 'var(--primary)',
      VISION: 'var(--primary)',
    };
    const code = type.code.toUpperCase();
    const usesOpdBalance = type.isSubOfOpd || ['DENTAL', 'VISION'].includes(code);
    const inpatientCodes = ['IPD'];
    const backendMessage = type.eligibilityMessage?.trim() || undefined;
    const probationStatus = this.probationEligibility();
    const hasBackendEligibility =
      typeof type.isSelectable === 'boolean' || typeof type.eligibilityMessage === 'string';
    const blockedByProbation = type.eligibleAfterProbation && probationStatus !== 'passed';
    const disabled = hasBackendEligibility
      ? type.isSelectable === false
      : type.remainingAmount <= 0 || blockedByProbation;
    const disabledReason = disabled
      ? backendMessage ||
        (blockedByProbation
          ? 'ยังไม่ผ่านโปรหรือยังยืนยันสิทธิ์ไม่ได้ จึงยังไม่สามารถเลือกประเภทนี้ได้'
          : usesOpdBalance
            ? 'วงเงิน OPD คงเหลือไม่พอ'
            : 'วงเงินคงเหลือไม่เพียงพอ')
      : undefined;
    const requiresEligibilityCheck =
      !disabled &&
      !hasBackendEligibility &&
      (!!backendMessage || type.eligibleAfterProbation);
    const helperText = disabled
      ? disabledReason
      : requiresEligibilityCheck
        ? backendMessage || 'ระบบจะตรวจสิทธิ์ก่อนส่งเบิก'
        : usesOpdBalance
          ? 'ใช้วงเงิน OPD คงเหลือ'
          : 'เบิกได้ตามสิทธิ์ปัจจุบัน';
    const ruleBadge = disabled
      ? 'เลือกไม่ได้'
      : requiresEligibilityCheck
        ? 'ตรวจสิทธิ์'
        : usesOpdBalance
          ? 'อิง OPD'
          : undefined;
    const guidanceText = disabled
      ? disabledReason
      : backendMessage ||
        (usesOpdBalance
          ? 'ประเภทนี้จะหักจากวงเงิน OPD คงเหลือ'
          : 'สามารถกรอกและส่งเบิกได้ตามสิทธิ์ปัจจุบัน');

    return {
      id: type.code.toLowerCase(),
      label: type.nameTh,
      amount: type.remainingAmount.toLocaleString('th-TH'),
      icon: iconMap[type.icon ?? ''] ?? 'fas fa-medkit',
      color: colorMap[type.code] ?? 'var(--primary)',
      group: inpatientCodes.includes(code) ? 'inpatient' : 'outpatient',
      disabled,
      disabledReason,
      helperText,
      ruleBadge,
      requiresEligibilityCheck,
      guidanceText,
    };
  }

  get outpatientTypes(): ClaimType[] {
    return this.claimTypes.filter((t) => t.group === 'outpatient');
  }

  get inpatientTypes(): ClaimType[] {
    return this.claimTypes.filter((t) => t.group === 'inpatient');
  }
  remark = signal<string>('');

  readonly eligibilityHintLines = [
    'พนักงานที่ยังไม่ผ่านโปรไม่สามารถเบิก IPD, Dental และ Vision ได้',
    'Dental และ Vision ใช้วงเงิน OPD คงเหลือ',
  ];

  getSelectedClaimTypeMeta(): ClaimType | undefined {
    return this.claimTypes.find((type) => type.id === this.selectedClaimType());
  }

  private resolveProbationEligibility(employee: any, allData: any): 'passed' | 'not_passed' | 'unknown' {
    const candidates = [employee, allData?.employee, allData, employee?.profile, employee?.info].filter(
      Boolean,
    );

    for (const source of candidates) {
      const directFlag = this.readProbationBoolean(source);
      if (directFlag !== null) {
        return directFlag ? 'passed' : 'not_passed';
      }

      const status = this.readStringField(source, [
        'EMP_STATUS',
        'empStatus',
        'employmentStatus',
        'employeeStatus',
        'STATUS',
        'status',
      ]);
      const statusResult = this.mapStatusToProbation(status);
      if (statusResult !== 'unknown') {
        return statusResult;
      }

      const endDate = this.readDateField(source, [
        'PROBATION_END_DATE',
        'probationEndDate',
        'probation_end_date',
        'ProbationEndDate',
      ]);
      if (endDate) {
        return dayjs().isAfter(endDate, 'day') || dayjs().isSame(endDate, 'day')
          ? 'passed'
          : 'not_passed';
      }

      const startDate = this.readDateField(source, [
        'CONTRACT_START_DATE',
        'contractStartDate',
        'contract_start_date',
        'START_DATE',
        'startDate',
        'JOIN_DATE',
        'joinDate',
        'HIRE_DATE',
        'hireDate',
        'employeeStartDate',
        'workStartDate',
      ]);
      if (startDate) {
        return dayjs().diff(startDate, 'day') >= MedicalexpensesForm.PROBATION_DAYS
          ? 'passed'
          : 'not_passed';
      }
    }

    return 'unknown';
  }

  private readProbationBoolean(source: any): boolean | null {
    const passKeys = [
      'isPastProbation',
      'passedProbation',
      'probationPassed',
      'isProbationPassed',
      'canClaimAfterProbation',
    ];
    const probationKeys = ['isOnProbation', 'onProbation', 'isUnderProbation'];

    for (const key of passKeys) {
      if (typeof source?.[key] === 'boolean') {
        return source[key];
      }
    }

    for (const key of probationKeys) {
      if (typeof source?.[key] === 'boolean') {
        return !source[key];
      }
    }

    return null;
  }

  private readStringField(source: any, keys: string[]): string | undefined {
    for (const key of keys) {
      if (typeof source?.[key] === 'string' && source[key].trim()) {
        return source[key].trim();
      }
    }
    return undefined;
  }

  private readDateField(source: any, keys: string[]): dayjs.Dayjs | null {
    for (const key of keys) {
      if (typeof source?.[key] === 'string' && source[key].trim()) {
        const parsed = dayjs(source[key]);
        if (parsed.isValid()) {
          return parsed;
        }
      }
    }
    return null;
  }

  private mapStatusToProbation(status?: string): 'passed' | 'not_passed' | 'unknown' {
    if (!status) return 'unknown';
    const normalized = status.trim().toLowerCase();

    const passedKeywords = [
      'a',
      'active',
      'employee',
      'employed',
      'regular',
      'passed probation',
      'pass probation',
      'confirmed',
      'permanent',
      'ผ่านโปร',
      'ผ่านทดลองงาน',
    ];
    if (
      passedKeywords.some((keyword) =>
        keyword.length === 1 ? normalized === keyword : normalized.includes(keyword),
      )
    ) {
      return 'passed';
    }

    const probationKeywords = [
      'p',
      'probation',
      'ทดลองงาน',
      'under probation',
      'on probation',
      'รอผ่านโปร',
    ];
    if (
      probationKeywords.some((keyword) =>
        keyword.length === 1 ? normalized === keyword : normalized.includes(keyword),
      )
    ) {
      return 'not_passed';
    }

    return 'unknown';
  }

  ngOnInit() {
    const employeeCode = this.authService.userData()?.CODEMPID ?? '';
    this.employeeId.set(employeeCode);

    const fiscalYear = dayjs().year();
    this.medicalService.getExpenseTypesWithBalance(employeeCode, fiscalYear).subscribe({
      next: (res) => {
        this.expenseTypesRaw = res.data;
        this.claimTypes = res.data.map((t) => this.mapExpenseType(t));
        this.loadRequestData();
      },
      error: () => this.loadRequestData(),
    });

    this.searchSub = this.hospitalSearch$
      .pipe(
        debounceTime(300),
        switchMap((keyword) => {
          // reset pagination เมื่อ keyword เปลี่ยน
          this.currentKeyword = keyword;
          this.currentPage = 1;
          this.isHospitalLoading.set(true);
          return this.medicalService.searchHospitals(keyword || undefined, 1, this.PAGE_SIZE).pipe(
            catchError(() => {
              this.isHospitalLoading.set(false);
              return of({ success: false, data: [], pagination: undefined });
            }),
          );
        }),
      )
      .subscribe((res) => {
        this.hospitalDropdown.set(res.data);
        this.hasNextPage = res.pagination?.hasNext ?? false;
        this.isHospitalDropdownOpen.set(res.data.length > 0);
        this.isHospitalLoading.set(false);
      });

    this.diseaseSearchSub = this.diseaseSearch$
      .pipe(
        debounceTime(300),
        switchMap((keyword) => {
          this.diseaseKeyword = keyword;
          this.diseasePage = 1;
          this.isDiseaseLoading.set(true);
          return this.medicalService
            .searchDiseaseTypes(keyword || undefined, undefined, undefined, 1, this.PAGE_SIZE)
            .pipe(
              catchError(() => {
                this.isDiseaseLoading.set(false);
                return of({ success: false, data: [], pagination: undefined });
              }),
            );
        }),
      )
      .subscribe((res) => {
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
    this.medicalService
      .searchHospitals(this.currentKeyword || undefined, nextPage, this.PAGE_SIZE)
      .pipe(catchError(() => of({ success: false, data: [], pagination: undefined })))
      .subscribe((res) => {
        this.hospitalDropdown.update((current) => [...current, ...res.data]);
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
    this.medicalService
      .searchDiseaseTypes(
        this.diseaseKeyword || undefined,
        undefined,
        undefined,
        nextPage,
        this.PAGE_SIZE,
      )
      .pipe(catchError(() => of({ success: false, data: [], pagination: undefined })))
      .subscribe((res) => {
        this.diseaseDropdown.update((current) => [...current, ...res.data]);
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
      const employeeCode = this.authService.userData()?.CODEMPID ?? '';
      this.medicalService.getClaimById(+this.requestId, employeeCode).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            const claim = res.data;
            this.isEditMode.set(true);
            this.currentDate.set(this.dateUtil.formatDateToThaiMonth(new Date(claim.createdAt)));

            this.hospital.set(claim.hospitalName);
            this.selectedHospitalObj.set({
              hospitalId: claim.hospitalId,
              nameTh: claim.hospitalName,
              nameEn: claim.hospitalName,
              shortName: claim.hospitalShortName,
              hospitalType: null,
              province: null,
              address: null,
              phone: null,
              isContracted: false,
              totalCount: 1,
            });

            this.disease.set(claim.diseaseName);
            this.selectedDiseaseObj.set({
              diseaseId: claim.diseaseId,
              code: claim.icd10Code ?? '',
              nameTh: claim.diseaseName,
              nameEn: claim.diseaseName,
              icd10Code: claim.icd10Code,
              category: null,
              expenseTypeId: null,
              isExcluded: false,
              excludeReason: null,
              sortOrder: 0,
              totalCount: 1,
            });

            const matchedType = this.expenseTypesRaw.find((t) => t.typeId === claim.expenseTypeId);
            if (matchedType) this.selectedClaimType.set(matchedType.code.toLowerCase());

            this.startDate.set(claim.treatmentDateFrom.split('T')[0]);
            this.endDate.set(claim.treatmentDateTo.split('T')[0]);
            this.amount = claim.requestedAmount.toString();
            this.remark.set(claim.remark ?? '');

            this.attachments.set(
              claim.attachments.map((a, i) => ({
                id: i + 1,
                attachmentId: a.attachmentId,
                name: a.fileName,
                description: a.remark ?? '',
              })),
            );
            this.removedAttachmentIds.set([]);
          } else {
            this.isEditMode.set(false);
            this.currentDate.set(this.dateUtil.formatDateToThaiMonth(dayjs().toDate()));
            this.resetDates();
          }
        },
        error: () => {
          this.isEditMode.set(false);
          this.currentDate.set(this.dateUtil.formatDateToThaiMonth(dayjs().toDate()));
          this.resetDates();
        },
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

  selectClaimType(type: ClaimType | string) {
    if (this.isSaving()) return;
    const selected = typeof type === 'string' ? this.claimTypes.find((item) => item.id === type) : type;
    if (!selected) return;
    if (selected.disabled) {
      this.toastService.warning(selected.disabledReason || 'ประเภทนี้ยังไม่สามารถเลือกได้');
      return;
    }
    this.selectedClaimType.set(selected.id);
  }

  deleteAttachment(id: number) {
    const att = this.attachments().find((a) => a.id === id);
    if (att?.attachmentId != null) {
      this.removedAttachmentIds.update((ids) => [...ids, att.attachmentId!]);
    }
    this.attachments.update((current) => current.filter((a) => a.id !== id));
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
        file,
      }));
      this.attachments.update((current) => [...current, ...newAttachments]);
    }
    input.value = '';
  }

  close() {
    this.onClose.emit();
  }

  openPreview(file: { name: string }) {
    this.previewFiles.set([
      {
        fileName: file.name,
        date: this.currentDate(),
      },
    ]);
    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }

  isValidSave() {
    if (this.amountError) {
      return false;
    }

    if (
      !this.hospital().trim() ||
      !this.disease().trim() ||
      !this.startDate() ||
      !this.endDate() ||
      !this.amount.trim()
    ) {
      return false; // ยังกรอกไม่ครบ
    }

    return true; // ครบทุก field
  }

  async save() {
    if (this.isSaving()) return;

    if (!this.selectedClaimType()) {
      this.toastService.warning('กรุณาเลือกประเภทการเบิกก่อนดำเนินการต่อ');
      this.claimTypeSectionEl?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
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

    if (this.parseNumber(this.amount) <= 0) {
      this.toastService.warning('จำนวนเงินที่เบิกต้องมากกว่า 0');
      this.amountInputEl?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.amountInputEl?.nativeElement.focus();
      this.amountHighlight.set(true);
      setTimeout(() => this.amountHighlight.set(false), 800);
      return;
    }

    const rawType = this.expenseTypesRaw.find(
      (t) => t.code.toLowerCase() === this.selectedClaimType(),
    );
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
    const files = attachmentList.map((a) => a.file).filter((f): f is File => f != null);
    const fileRemarks = attachmentList.map((a) => a.description);

    const confirmed = await this.dialogService.confirm({
      title: this.isEditMode() ? 'ยืนยันการแก้ไขการเบิก' : 'ยืนยันการส่งเรื่องเบิก',
      message: `ต้องการ${this.isEditMode() ? 'แก้ไข' : 'ส่ง'}เรื่องเบิกค่ารักษาพยาบาล <strong>${rawType.nameTh}</strong><br>จำนวน <strong>${this.parseNumber(this.amount).toLocaleString('th-TH')} บาท</strong> ใช่หรือไม่?`,
      confirmText: this.isEditMode() ? 'ยืนยันการแก้ไข' : 'ส่งเรื่องเบิก',
      cancelText: 'ยกเลิก',
      type: 'info',
    });

    if (!confirmed) return;

    this.isSaving.set(true);
    this.swalService.loading('กำลังบันทึกข้อมูล...');

    const commonParams = {
      employee_code: this.employeeId(),
      expense_type_id: rawType.typeId,
      hospital_id: hosp.hospitalId,
      disease_id: disease.diseaseId,
      treatment_date_from: dayjs(this.startDate()).format('YYYY-MM-DD'),
      treatment_date_to: dayjs(this.endDate()).format('YYYY-MM-DD'),
      requested_amount: this.parseNumber(this.amount),
      remark: this.remark() || undefined,
      files: files.length > 0 ? files : undefined,
      file_remarks: fileRemarks.length > 0 ? fileRemarks : undefined,
    };

    const request$ = this.isEditMode()
      ? this.medicalService.updateClaim(+this.requestId, {
          ...commonParams,
          remove_attachment_ids:
            this.removedAttachmentIds().length > 0 ? this.removedAttachmentIds() : undefined,
        })
      : this.medicalService.submitClaim({ ...commonParams, treatment_days: this.calculatedDays() });

    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.swalService.success(
          this.isEditMode() ? 'แก้ไขรายการสำเร็จ' : 'ส่งเรื่องเบิกเรียบร้อยแล้ว',
        );
        this.close();
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        const message = this.getSubmitErrorMessage(error);
        this.swalService.warning(
          this.isEditMode() ? 'ไม่สามารถแก้ไขรายการได้' : 'ไม่สามารถส่งเรื่องเบิกได้',
          message,
        );
      },
    });
  }

  private getSubmitErrorMessage(error: HttpErrorResponse): string {
    const apiMessage = this.extractApiMessage(error);

    if (error.status === 422 && apiMessage) {
      return apiMessage;
    }

    if (apiMessage) {
      return apiMessage;
    }

    return this.isEditMode()
      ? 'เกิดข้อผิดพลาดในการแก้ไขรายการ กรุณาลองใหม่อีกครั้ง'
      : 'เกิดข้อผิดพลาดในการส่งเรื่อง กรุณาลองใหม่อีกครั้ง';
  }

  private extractApiMessage(error: HttpErrorResponse): string | undefined {
    const payload = error?.error;

    if (typeof payload === 'string' && payload.trim()) {
      return payload.trim();
    }

    if (payload?.message && typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message.trim();
    }

    if (
      payload?.error?.message &&
      typeof payload.error.message === 'string' &&
      payload.error.message.trim()
    ) {
      return payload.error.message.trim();
    }

    if (payload?.error && typeof payload.error === 'string' && payload.error.trim()) {
      return payload.error.trim();
    }

    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      const firstError = payload.errors.find((item: unknown) => typeof item === 'string');
      if (typeof firstError === 'string' && firstError.trim()) {
        return firstError.trim();
      }
    }

    return undefined;
  }

  // FUNCTION

  parseNumber(value: string | number): number {
    if (typeof value === 'number') return value; // already number
    return Number(value.replace(/,/g, ''));
  }
  formatNumber(value: number): string {
    return value.toLocaleString('en-US');
  }

  onAmountInput(event: Event) {
    const input = event.target as HTMLInputElement;

    // กรองให้เหลือแค่ 0-9 , .
    let value = input.value.replace(/[^0-9\.,]/g, '');

    // ปัดเศษ 2 ตำแหน่ง และใส่ comma
    const money = formatMoneyInput(value);

    this.amount = money;

    // อัพเดต input จริง ๆ ให้แสดงค่า formatted
    input.value = money;

    // ตรวจสอบ max amount
    const selectedId = this.selectedClaimType();
    const claim = this.claimTypes.find((item) => item.id === selectedId);
    const maxAmount = this.parseNumber(claim?.amount || 0);
    const numericValue = this.parseNumber(money);

    this.amountError =
      numericValue > maxAmount
        ? `จำนวนเงินต้องไม่เกิน ${maxAmount.toLocaleString('en-US')} บาท`
        : null;
  }
}
