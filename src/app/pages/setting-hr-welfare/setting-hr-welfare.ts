import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { ModalShellComponent } from '../../components/shared/modal-shell/modal-shell';
import { SwalService } from '../../services/swal.service';
import { HrWelfareFormValue, HrWelfareResponsible } from '../../interfaces/hr-welfare.interface';

/** Mock master data — TODO: replace with real Master API once backend is ready. */
const MOCK_HR_LIST = [
  { code: 'HR001', name: 'นก' },
  { code: 'HR002', name: 'ศิริพร' },
  { code: 'HR003', name: 'วราภรณ์' },
  { code: 'HR004', name: 'กมลชนก' },
  { code: 'HR005', name: 'อัญชนา' },
];

const MOCK_WELFARE_TYPES = [
  'ค่ารักษาพยาบาล',
  'ประกันชีวิต',
  'เงินช่วยเหลือกรณีฉุกเฉิน',
  'สวัสดิการครอบครัว',
  'ทุนการศึกษา',
  'ประกันอุบัติเหตุ',
  'ตรวจสุขภาพประจำปี',
  'วัคซีน',
];

const MOCK_COMPANIES = ['ONEE', 'GMMTV', 'CHANGE', 'ATIME'];

let mockIdSeq = 100;

function createMockRows(): HrWelfareResponsible[] {
  return [
    {
      id: 1,
      hrCode: 'HR001',
      hrName: 'นก',
      welfareTypes: ['ค่ารักษาพยาบาล', 'ประกันชีวิต', 'เงินช่วยเหลือกรณีฉุกเฉิน'],
      companies: ['ONEE', 'GMMTV'],
      note: 'ดูแลพนักงานสำนักงานใหญ่',
    },
    {
      id: 2,
      hrCode: 'HR002',
      hrName: 'ศิริพร',
      welfareTypes: ['เงินช่วยเหลือกรณีฉุกเฉิน'],
      companies: ['ONEE'],
      note: 'เฉพาะพนักงานประจำ',
    },
    {
      id: 3,
      hrCode: 'HR003',
      hrName: 'วราภรณ์',
      welfareTypes: ['สวัสดิการครอบครัว', 'ทุนการศึกษา', 'ประกันชีวิต'],
      companies: ['ONEE', 'CHANGE', 'GMMTV'],
      note: 'รวมบุตรบุญธรรม',
    },
    {
      id: 4,
      hrCode: 'HR004',
      hrName: 'กมลชนก',
      welfareTypes: ['ประกันอุบัติเหตุ'],
      companies: ['GMMTV'],
      note: '-',
    },
    {
      id: 5,
      hrCode: 'HR005',
      hrName: 'อัญชนา',
      welfareTypes: ['ตรวจสุขภาพประจำปี', 'วัคซีน'],
      companies: ['ONEE', 'ATIME'],
      note: 'ประสานงานกับ รพ. คู่สัญญา',
    },
    {
      id: 6,
      hrCode: 'HR001',
      hrName: 'นก',
      welfareTypes: ['ตรวจสุขภาพประจำปี'],
      companies: ['CHANGE'],
      note: '-',
    },
    {
      id: 7,
      hrCode: 'HR002',
      hrName: 'ศิริพร',
      welfareTypes: ['ประกันอุบัติเหตุ', 'วัคซีน'],
      companies: ['ATIME'],
      note: '-',
    },
    {
      id: 8,
      hrCode: 'HR003',
      hrName: 'วราภรณ์',
      welfareTypes: ['ค่ารักษาพยาบาล'],
      companies: ['ONEE'],
      note: 'ดูแลกรณีฉุกเฉินนอกเวลางาน',
    },
  ];
}

function emptyForm(): HrWelfareFormValue {
  return { hrCodes: [], welfareTypes: [], companies: [], note: '' };
}

@Component({
  selector: 'app-setting-hr-welfare',
  imports: [FormsModule, NzSelectModule, EmptyStateComponent, ModalShellComponent],
  templateUrl: './setting-hr-welfare.html',
  styleUrl: './setting-hr-welfare.scss',
})
export class SettingHrWelfare {
  private readonly swalService = inject(SwalService);

  readonly hrList = MOCK_HR_LIST;
  readonly welfareTypeList = MOCK_WELFARE_TYPES;
  readonly companyList = MOCK_COMPANIES;

  readonly rows = signal<HrWelfareResponsible[]>(createMockRows());

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

  readonly filteredRows = computed(() => {
    const text = this.searchText().trim().toLowerCase();
    const hrCode = this.filterHrCode();
    const welfareType = this.filterWelfareType();
    const company = this.filterCompany();

    return this.rows().filter((row) => {
      if (hrCode && row.hrCode !== hrCode) return false;
      if (welfareType && !row.welfareTypes.includes(welfareType)) return false;
      if (company && !row.companies.includes(company)) return false;
      if (text) {
        const haystack = [row.hrName, ...row.welfareTypes, ...row.companies, row.note]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(text)) return false;
      }
      return true;
    });
  });

  readonly totalItems = computed(() => this.filteredRows().length);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize())));

  readonly pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1),
  );

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
    return this.hrList.find((hr) => hr.code === code)?.name ?? code;
  }

  // The 3 multi-selects below keep ant's real nzMode="multiple" control (bound directly to
  // these arrays) but visually hidden — a fixed label overlay plus our own chip row underneath
  // stand in for its native tag rendering, since the target design never lets the trigger
  // itself display a selection.
  removeHr(code: string): void {
    this.form.hrCodes = this.form.hrCodes.filter((c) => c !== code);
  }

  removeWelfareType(type: string): void {
    this.form.welfareTypes = this.form.welfareTypes.filter((t) => t !== type);
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

  openEdit(row: HrWelfareResponsible): void {
    this.editingId.set(row.id);
    this.hasSubmitted.set(false);
    this.form = {
      hrCodes: [row.hrCode],
      welfareTypes: [...row.welfareTypes],
      companies: [...row.companies],
      note: row.note === '-' ? '' : row.note,
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

  async save(): Promise<void> {
    this.hasSubmitted.set(true);
    if (!this.isFormValid()) return;

    const editingId = this.editingId();
    const confirmation = await this.swalService.confirm(
      editingId === null ? 'ยืนยันการเพิ่มผู้รับผิดชอบสวัสดิการ?' : 'ยืนยันการแก้ไขผู้รับผิดชอบสวัสดิการ?',
    );
    if (!confirmation.isConfirmed) return;

    this.isSaving.set(true);

    const note = this.form.note.trim() || '-';
    const welfareTypes = [...this.form.welfareTypes];
    const companies = [...this.form.companies];

    if (editingId === null) {
      const newRows: HrWelfareResponsible[] = this.form.hrCodes.map((hrCode) => ({
        id: ++mockIdSeq,
        hrCode,
        hrName: this.hrNameByCode(hrCode),
        welfareTypes,
        companies,
        note,
      }));
      this.rows.update((current) => [...current, ...newRows]);
    } else {
      const hrCode = this.form.hrCodes[0];
      this.rows.update((current) =>
        current.map((row) =>
          row.id === editingId
            ? { ...row, hrCode, hrName: this.hrNameByCode(hrCode), welfareTypes, companies, note }
            : row,
        ),
      );
    }

    this.isSaving.set(false);
    this.isModalOpen.set(false);
    this.swalService.success(
      editingId === null ? 'เพิ่มผู้รับผิดชอบสวัสดิการสำเร็จ' : 'แก้ไขผู้รับผิดชอบสวัสดิการสำเร็จ',
    );
  }

  async deleteRow(row: HrWelfareResponsible): Promise<void> {
    if (this.deletingId() !== null) return;

    const confirmation = await this.swalService.confirm(
      'ยืนยันการลบผู้รับผิดชอบสวัสดิการ?',
      `ลบ "${row.hrName}" ออกจากรายการนี้`,
    );
    if (!confirmation.isConfirmed) return;

    this.deletingId.set(row.id);
    this.rows.update((current) => current.filter((r) => r.id !== row.id));
    this.deletingId.set(null);
    this.swalService.success('ลบผู้รับผิดชอบสวัสดิการสำเร็จ');

    const maxPage = this.totalPages() - 1;
    if (this.currentPage() > maxPage) this.currentPage.set(maxPage);
  }
}
