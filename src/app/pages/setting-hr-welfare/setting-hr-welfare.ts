import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { catchError, of } from 'rxjs';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { ModalShellComponent } from '../../components/shared/modal-shell/modal-shell';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { AuthService } from '../../services/auth.service';
import { MasterDataService } from '../../services/master-data.service';
import { SwalService } from '../../services/swal.service';
import {
  HrWelfareFormValue,
  HrWelfareResponsibility,
  SaveWelfareResponsibilityItem,
} from '../../interfaces/hr-welfare.interface';

/** Fallback รายชื่อ HR — ใช้เมื่อเรียก Master/employees ไม่สำเร็จ */
const MOCK_HR_LIST = [
  { code: 'HR001', name: 'นก' },
  { code: 'HR002', name: 'ศิริพร' },
  { code: 'HR003', name: 'วราภรณ์' },
  { code: 'HR004', name: 'กมลชนก' },
  { code: 'HR005', name: 'อัญชนา' },
];

/** Fallback ประเภทสวัสดิการ — ใช้เมื่อเรียก Master/company-welfares ไม่สำเร็จ */
const MOCK_WELFARE_TYPES = [
  { code: 'WF001', name: 'ค่ารักษาพยาบาล' },
  { code: 'WF002', name: 'ประกันชีวิต' },
  { code: 'WF003', name: 'เงินช่วยเหลือกรณีฉุกเฉิน' },
  { code: 'WF004', name: 'สวัสดิการครอบครัว' },
  { code: 'WF005', name: 'ทุนการศึกษา' },
  { code: 'WF006', name: 'ประกันอุบัติเหตุ' },
  { code: 'WF007', name: 'ตรวจสุขภาพประจำปี' },
  { code: 'WF008', name: 'วัคซีน' },
];

const MOCK_COMPANY_CODES = ['ONEE', 'GMMTV', 'CHANGE', 'ATIME'];

function createMockRows(): HrWelfareResponsibility[] {
  return [
    {
      id: 1,
      hrCodeEmp: 'HR001',
      hrName: 'นก',
      welfareCodes: ['WF001', 'WF002', 'WF003'],
      companyCodes: ['ONEE', 'GMMTV'],
      remark: 'ดูแลพนักงานสำนักงานใหญ่',
      createdBy: 'system',
      createdDate: new Date().toISOString(),
      updatedBy: null,
      updatedDate: null,
    },
    {
      id: 2,
      hrCodeEmp: 'HR002',
      hrName: 'ศิริพร',
      welfareCodes: ['WF003'],
      companyCodes: ['ONEE'],
      remark: 'เฉพาะพนักงานประจำ',
      createdBy: 'system',
      createdDate: new Date().toISOString(),
      updatedBy: null,
      updatedDate: null,
    },
    {
      id: 3,
      hrCodeEmp: 'HR003',
      hrName: 'วราภรณ์',
      welfareCodes: ['WF004', 'WF005', 'WF002'],
      companyCodes: ['ONEE', 'CHANGE', 'GMMTV'],
      remark: 'รวมบุตรบุญธรรม',
      createdBy: 'system',
      createdDate: new Date().toISOString(),
      updatedBy: null,
      updatedDate: null,
    },
    {
      id: 4,
      hrCodeEmp: 'HR004',
      hrName: 'กมลชนก',
      welfareCodes: ['WF006'],
      companyCodes: ['GMMTV'],
      remark: null,
      createdBy: 'system',
      createdDate: new Date().toISOString(),
      updatedBy: null,
      updatedDate: null,
    },
    {
      id: 5,
      hrCodeEmp: 'HR005',
      hrName: 'อัญชนา',
      welfareCodes: ['WF007', 'WF008'],
      companyCodes: ['ONEE', 'ATIME'],
      remark: 'ประสานงานกับ รพ. คู่สัญญา',
      createdBy: 'system',
      createdDate: new Date().toISOString(),
      updatedBy: null,
      updatedDate: null,
    },
    {
      id: 6,
      hrCodeEmp: 'HR001',
      hrName: 'นก',
      welfareCodes: ['WF007'],
      companyCodes: ['CHANGE'],
      remark: null,
      createdBy: 'system',
      createdDate: new Date().toISOString(),
      updatedBy: null,
      updatedDate: null,
    },
    {
      id: 7,
      hrCodeEmp: 'HR002',
      hrName: 'ศิริพร',
      welfareCodes: ['WF006', 'WF008'],
      companyCodes: ['ATIME'],
      remark: null,
      createdBy: 'system',
      createdDate: new Date().toISOString(),
      updatedBy: null,
      updatedDate: null,
    },
    {
      id: 8,
      hrCodeEmp: 'HR003',
      hrName: 'วราภรณ์',
      welfareCodes: ['WF001'],
      companyCodes: ['ONEE'],
      remark: 'ดูแลกรณีฉุกเฉินนอกเวลางาน',
      createdBy: 'system',
      createdDate: new Date().toISOString(),
      updatedBy: null,
      updatedDate: null,
    },
  ];
}

function emptyForm(): HrWelfareFormValue {
  return { hrCodes: [], welfareTypes: [], companies: [], note: '' };
}

@Component({
  selector: 'app-setting-hr-welfare',
  imports: [
    FormsModule,
    NzSelectModule,
    EmptyStateComponent,
    ModalShellComponent,
    SkeletonComponent,
  ],
  templateUrl: './setting-hr-welfare.html',
  styleUrl: './setting-hr-welfare.scss',
})
export class SettingHrWelfare implements OnInit {
  private readonly masterDataService = inject(MasterDataService);
  private readonly swalService = inject(SwalService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly hrList = signal<{ code: string; name: string }[]>(MOCK_HR_LIST);
  readonly welfareTypeList = signal<{ code: string; name: string }[]>(MOCK_WELFARE_TYPES);
  readonly companyList = signal<string[]>([...MOCK_COMPANY_CODES]);

  readonly rows = signal<HrWelfareResponsibility[]>([]);
  readonly isLoading = signal(true);

  // filter bar
  readonly searchText = signal('');
  readonly filterHrCode = signal<string | null>(null);
  readonly filterWelfareType = signal<string | null>(null);
  readonly filterCompany = signal<string | null>(null);

  // pagination (0-indexed)
  readonly pageSizeOptions = [10, 20, 50];
  readonly currentPage = signal(0);
  readonly pageSize = signal(10);

  // modal / form
  readonly isModalOpen = signal(false);
  readonly isSaving = signal(false);
  readonly hasSubmitted = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly deletingId = signal<number | null>(null);
  form: HrWelfareFormValue = emptyForm();

  ngOnInit(): void {
    this.loadRows();
    this.loadCompanies();
    this.loadHrList();
    this.loadWelfareTypes();
  }

  loadRows(): void {
    this.isLoading.set(true);
    this.masterDataService
      .getWelfareResponsibilities()
      .pipe(
        catchError(() => of({ success: true, data: createMockRows() })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.rows.set(res.data);
        this.isLoading.set(false);
      });
  }

  loadCompanies(): void {
    this.masterDataService
      .getCompanyMaster()
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (!res) return;
        const list = Array.isArray(res) ? res : (res.data ?? []);
        const codes = list.map((c: any) => c.COMPANY_CODE).filter(Boolean);
        if (codes.length > 0) this.companyList.set(codes);
      });
  }

  /** ดึงรายชื่อ HR จริงจาก Master/hr-personnel (fallback เป็น MOCK_HR_LIST ถ้าเรียกไม่สำเร็จ) */
  loadHrList(): void {
    this.masterDataService
      .getHrPersonnel()
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (!res) return;
        const items = res.data ?? [];
        const list = items
          .map((item: any) => ({
            code: item.CODEMPID,
            name: item.FULLNAME + ' (' + item.NICKNAME + ')' || item.CODEMPID,
          }))
          .filter((hr: { code: string; name: string }) => !!hr.code);
        if (list.length > 0) this.hrList.set(list);
      });
  }

  /** ดึง master ประเภทสวัสดิการจาก Master/company-welfares (ผูกคู่ CompanyCode+WelfareCode
   * เลยต้อง dedupe เอา WelfareCode ที่ไม่ซ้ำ, fallback เป็น MOCK_WELFARE_TYPES ถ้าเรียกไม่สำเร็จ) */
  loadWelfareTypes(): void {
    this.masterDataService
      .getCompanyWelfares()
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (!res) return;
        const items = Array.isArray(res) ? res : (res.data ?? []);
        const seen = new Set<string>();
        const list: { code: string; name: string }[] = [];
        for (const item of items) {
          const code = item.WelfareCode || item.welfareCode;
          if (!code || seen.has(code)) continue;
          seen.add(code);
          list.push({ code, name: item.WelfareNameTH || item.welfareNameTH || code });
        }
        if (list.length > 0) this.welfareTypeList.set(list);
      });
  }

  readonly filteredRows = computed(() => {
    const text = this.searchText().trim().toLowerCase();
    const hrCode = this.filterHrCode();
    const welfareType = this.filterWelfareType();
    const company = this.filterCompany();

    return this.rows().filter((row) => {
      if (hrCode && row.hrCodeEmp !== hrCode) return false;
      if (welfareType && !row.welfareCodes.includes(welfareType)) return false;
      if (company && !row.companyCodes.includes(company)) return false;
      if (text) {
        const haystack = [
          row.hrName,
          ...row.welfareCodes.map((c) => this.welfareNameByCode(c)),
          ...row.companyCodes,
          row.remark ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(text)) return false;
      }
      return true;
    });
  });

  readonly totalItems = computed(() => this.filteredRows().length);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize())));

  readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  readonly paginatedRows = computed(() => {
    const start = this.currentPage() * this.pageSize();
    return this.filteredRows().slice(start, start + this.pageSize());
  });

  applyFilter(): void {
    this.currentPage.set(0);
  }

  clearFilter(): void {
    this.searchText.set('');
    this.filterHrCode.set(null);
    this.filterWelfareType.set(null);
    this.filterCompany.set(null);
    this.currentPage.set(0);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(0);
  }

  visibleTags(list: string[], max = 2): string[] {
    return list.slice(0, max);
  }

  overflowCount(list: string[], max = 2): number {
    return Math.max(0, list.length - max);
  }

  hrNameByCode(code: string): string {
    return this.hrList().find((hr) => hr.code === code)?.name ?? code;
  }

  welfareNameByCode(code: string): string {
    return this.welfareTypeList().find((wf) => wf.code === code)?.name ?? code;
  }

  // The 3 multi-selects below keep ant's real nzMode="multiple" control (bound directly to
  // these arrays) but visually hidden — a fixed label overlay plus our own chip row underneath
  // stand in for its native tag rendering, since the target design never lets the trigger
  // itself display a selection.
  removeHr(code: string): void {
    this.form.hrCodes = this.form.hrCodes.filter((c) => c !== code);
  }

  removeWelfareType(code: string): void {
    this.form.welfareTypes = this.form.welfareTypes.filter((c) => c !== code);
  }

  removeCompany(company: string): void {
    this.form.companies = this.form.companies.filter((c) => c !== company);
  }

  openCreate(): void {
    this.editingId.set(null);
    this.hasSubmitted.set(false);
    this.form = emptyForm();
    this.isModalOpen.set(true);
  }

  openEdit(row: HrWelfareResponsibility): void {
    this.editingId.set(row.id);
    this.hasSubmitted.set(false);
    this.form = {
      hrCodes: [row.hrCodeEmp],
      welfareTypes: [...row.welfareCodes],
      companies: [...row.companyCodes],
      note: row.remark ?? '',
    };
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    if (this.isSaving()) return;
    this.isModalOpen.set(false);
  }

  isFormValid(): boolean {
    return (
      this.form.hrCodes.length > 0 &&
      this.form.welfareTypes.length > 0 &&
      this.form.companies.length > 0
    );
  }

  private getCurrentExecutor(): string {
    const user = this.authService.userData();
    return user?.CODEMPID ?? user?.AD_USER ?? '';
  }

  async save(): Promise<void> {
    this.hasSubmitted.set(true);
    if (!this.isFormValid()) return;

    const editingId = this.editingId();
    const confirmation = await this.swalService.confirm(
      editingId === null
        ? 'ยืนยันการเพิ่มผู้รับผิดชอบสวัสดิการ?'
        : 'ยืนยันการแก้ไขผู้รับผิดชอบสวัสดิการ?',
    );
    if (!confirmation.isConfirmed) return;

    this.isSaving.set(true);

    const executedBy = this.getCurrentExecutor();
    const remark = this.form.note.trim();
    const welfareCodes = this.form.welfareTypes.join(',');
    const companies = this.form.companies.join(',');

    const items: SaveWelfareResponsibilityItem[] =
      editingId === null
        ? this.form.hrCodes.map((hrCodeEmp) => ({
            hrCodeEmp,
            hrName: this.hrNameByCode(hrCodeEmp),
            welfareCodes,
            companyCodes: companies,
            remark,
            executedBy,
          }))
        : [
            {
              id: editingId,
              hrCodeEmp: this.form.hrCodes[0],
              hrName: this.hrNameByCode(this.form.hrCodes[0]),
              welfareCodes,
              companyCodes: companies,
              remark,
              executedBy,
            },
          ];

    this.masterDataService
      .saveWelfareResponsibilities(items)
      .pipe(
        catchError((err) =>
          of({
            success: false,
            message: err?.error?.message ?? 'บันทึกข้อมูลไม่สำเร็จ',
            totalRecords: 0,
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.isSaving.set(false);
        if (!res.success) {
          this.swalService.error('บันทึกไม่สำเร็จ', res.message);
          return;
        }
        this.isModalOpen.set(false);
        this.loadRows();
        this.swalService.success(
          editingId === null
            ? 'เพิ่มผู้รับผิดชอบสวัสดิการสำเร็จ'
            : 'แก้ไขผู้รับผิดชอบสวัสดิการสำเร็จ',
        );
      });
  }

  async deleteRow(row: HrWelfareResponsibility): Promise<void> {
    if (this.deletingId() !== null) return;

    const confirmation = await this.swalService.confirm(
      'ยืนยันการลบผู้รับผิดชอบสวัสดิการ?',
      `ลบ "${row.hrName}" ออกจากรายการนี้`,
    );
    if (!confirmation.isConfirmed) return;

    this.deletingId.set(row.id);

    this.masterDataService
      .deleteWelfareResponsibility(row.id, this.getCurrentExecutor())
      .pipe(
        catchError((err) =>
          of({ success: false, message: err?.error?.message ?? 'ลบข้อมูลไม่สำเร็จ' }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.deletingId.set(null);
        if (!res.success) {
          this.swalService.error('ลบไม่สำเร็จ', res.message);
          return;
        }
        this.loadRows();
        this.swalService.success('ลบผู้รับผิดชอบสวัสดิการสำเร็จ');

        const maxPage = this.totalPages() - 1;
        if (this.currentPage() > maxPage) this.currentPage.set(maxPage);
      });
  }
}
