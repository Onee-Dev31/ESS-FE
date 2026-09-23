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

  readonly hrList = signal<{ code: string; name: string; adUser: string }[]>([]);
  readonly welfareTypeList = signal<{ code: string; name: string }[]>([]);
  readonly companyList = signal<string[]>([]);

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

  // ตาราง: คีย์ "{id}:{welfare|company}" ของแถวที่กด "+N" ขยายดูเต็มแล้ว
  readonly expandedCells = signal<Set<string>>(new Set());

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
        catchError(() => {
          this.swalService.error('โหลดข้อมูลไม่สำเร็จ', 'ไม่สามารถดึงข้อมูลผู้รับผิดชอบสวัสดิการได้');
          return of({ success: false, data: [] });
        }),
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
        const codes = list
          .map((c: any) => c.COMPANY_CODE)
          .filter(Boolean)
          .sort((a: string, b: string) => a.localeCompare(b));
        if (codes.length > 0) this.companyList.set(codes);
      });
  }

  /** ดึงรายชื่อ HR จริงจาก Master/hr-personnel */
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
            adUser: item.AD_USER ?? '',
          }))
          .filter((hr: { code: string; name: string; adUser: string }) => !!hr.code);
        if (list.length > 0) this.hrList.set(list);
      });
  }

  /** ดึง master ประเภทสวัสดิการจาก Master/company-welfares (ผูกคู่ CompanyCode+WelfareCode
   * เลยต้อง dedupe เอา WelfareCode ที่ไม่ซ้ำ) */
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
      if (welfareType && !row.welfareCodes.some((c) => this.welfarePartOf(c) === welfareType))
        return false;
      if (company && !row.welfareCodes.some((c) => this.companyPartOf(c) === company)) return false;
      if (text) {
        const haystack = [
          row.hrName,
          ...row.welfareCodes.map((c) => this.welfareNameByCode(c)),
          ...this.companyCodesOfRow(row),
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

  /** ตัวเลือก HR ในโมดัล — โหมดเพิ่ม: ตัด HR ที่มีแถวอยู่แล้วออก (กันแถวซ้ำคนเดิม, ต้องแก้ไขแถวเดิมแทน)
   * โหมดแก้ไข: เห็นเต็มลิสต์ตามปกติ (มีแค่ตัวเองอยู่แล้วในฟอร์ม) */
  readonly modalHrOptions = computed(() => {
    if (this.editingId() !== null) return this.hrList();
    const usedCodes = new Set(this.rows().map((r) => r.hrCodeEmp));
    return this.hrList().filter((hr) => !usedCodes.has(hr.code));
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

  visibleTags(list: string[], expanded: boolean, max = 2): string[] {
    return expanded ? list : list.slice(0, max);
  }

  overflowCount(list: string[], expanded: boolean, max = 2): number {
    return expanded ? 0 : Math.max(0, list.length - max);
  }

  isExpanded(rowId: number, column: 'welfare' | 'company'): boolean {
    return this.expandedCells().has(`${rowId}:${column}`);
  }

  toggleExpand(rowId: number, column: 'welfare' | 'company'): void {
    const key = `${rowId}:${column}`;
    const next = new Set(this.expandedCells());
    next.has(key) ? next.delete(key) : next.add(key);
    this.expandedCells.set(next);
  }

  hrNameByCode(code: string): string {
    return this.hrList().find((hr) => hr.code === code)?.name ?? code;
  }

  adUserByCode(code: string): string {
    return this.hrList().find((hr) => hr.code === code)?.adUser ?? '';
  }

  // welfareCodes token คือ "CompanyCode-WelfareCode" ต่อกัน เช่น "OTD-WF001"
  private companyPartOf(code: string): string {
    const idx = code.indexOf('-');
    return idx === -1 ? '' : code.slice(0, idx);
  }

  private welfarePartOf(code: string): string {
    const idx = code.indexOf('-');
    return idx === -1 ? code : code.slice(idx + 1);
  }

  welfareNameByCode(code: string): string {
    const welfareCode = this.welfarePartOf(code);
    return this.welfareTypeList().find((wf) => wf.code === welfareCode)?.name ?? welfareCode;
  }

  companyCodesOfRow(row: HrWelfareResponsibility): string[] {
    return Array.from(new Set(row.welfareCodes.map((c) => this.companyPartOf(c)).filter(Boolean)));
  }

  // row.welfareCodes เป็น cross-join บริษัท x ประเภท ต้อง dedupe ไม่งั้นชื่อประเภทซ้ำตามจำนวนบริษัท
  welfareTypesOfRow(row: HrWelfareResponsibility): string[] {
    return Array.from(new Set(row.welfareCodes.map((c) => this.welfarePartOf(c))));
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
      welfareTypes: Array.from(new Set(row.welfareCodes.map((c) => this.welfarePartOf(c)))),
      companies: this.companyCodesOfRow(row),
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

  // cross-join บริษัท x ประเภทที่เลือกในฟอร์ม เป็น "CompanyCode-WelfareCode" คั่นด้วย comma
  private buildWelfareCodes(): string {
    const pairs: string[] = [];
    for (const company of this.form.companies) {
      for (const welfareType of this.form.welfareTypes) {
        pairs.push(`${company}-${welfareType}`);
      }
    }
    return pairs.join(',');
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

    const createdBy = this.getCurrentExecutor();
    const remark = this.form.note.trim();
    const welfareCodes = this.buildWelfareCodes();

    // ไม่ส่ง id — SP จับคู่ insert/update เองจาก adUser/hrCodeEmp
    const items: SaveWelfareResponsibilityItem[] = this.form.hrCodes.map((hrCodeEmp) => ({
      hrCodeEmp,
      adUser: this.adUserByCode(hrCodeEmp),
      hrName: this.hrNameByCode(hrCodeEmp),
      welfareCodes,
      remark,
      createdBy,
    }));

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
