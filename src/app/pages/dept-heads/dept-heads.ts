import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { SettingService } from '../../services/setting.service';
import { LoadingService } from '../../services/loading';
import { AuthService } from '../../services/auth.service';
import { SwalService } from '../../services/swal.service';

interface DeptHeadPerson {
  level: number;
  code: string;
  name: string;
  num_lvl: number;
}

interface DeptEmployee {
  emp_code: string;
  emp_name: string;
  nickname: string | null;
  numlvl: number;
}

interface DeptHeadItem {
  cost_cent: string;
  name_cost_cent: string;
  company_code: string;
  company_name: string;
  heads: DeptHeadPerson[];
  employees: DeptEmployee[];
}

interface DeptHeadOverride {
  cost_cent: string;
  level: number;
  codeempid: string;
  emp_name: string;
  num_lvl: number;
  reason: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface FormRow {
  level: number;
  empCode: string;
  isExisting: boolean;
}

interface OverrideGroup {
  cost_cent: string;
  name_cost_cent: string;
  rows: DeptHeadOverride[];
}

interface EmpHeadOverride {
  id: number;
  employee_codeempid: string;
  emp_name: string;
  emp_nickname: string | null;
  cost_cent: string;
  level: number;
  head_codeempid: string;
  head_name: string;
  head_nickname: string | null;
  reason: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface MixedEntry {
  empName: string;
  headName: string | null;
}

interface EmpOverrideFormRow {
  level: number;
  headCode: string;
  isExisting: boolean;
  isMixed?: boolean;
  mixedEntries?: MixedEntry[];
}

@Component({
  selector: 'app-dept-heads',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzSelectModule,
    PageHeaderComponent,
    SkeletonComponent,
    EmptyStateComponent,
    PaginationComponent,
  ],
  templateUrl: './dept-heads.html',
  styleUrl: './dept-heads.scss',
})
export class DeptHeadsComponent implements OnInit {
  private settingService = inject(SettingService);
  private loadingService = inject(LoadingService);
  private authService = inject(AuthService);
  private swalService = inject(SwalService);

  pageTitle = signal<string>('หัวหน้าแผนก');
  items = signal<DeptHeadItem[]>([]);
  isLoading = this.loadingService.loading('dept-heads');

  // Tab
  activeTab = signal<'list' | 'override' | 'emp-override'>('list');

  // Filter state
  filterText = signal<string>('');
  filterCompany = signal<string>('');
  filterDept = signal<string>('');
  appliedText = signal<string>('');
  appliedCompany = signal<string>('');
  appliedDept = signal<string>('');

  // Detail modal
  selectedDept = signal<DeptHeadItem | null>(null);

  // Pagination
  currentPage = signal<number>(0);
  pageSize = signal<number>(10);

  // Override state
  overrides = signal<DeptHeadOverride[]>([]);
  isOverrideLoading = this.loadingService.loading('dept-overrides');
  isSaving = signal<boolean>(false);

  // Override form
  formCompanyFilter = signal<string>('');
  formDeptCode = signal<string>('');
  formRows = signal<FormRow[]>([]);
  formReason = signal<string>('');

  // Emp override state
  empCompanyFilter = signal<string>('');
  empDeptFilter = signal<string>('');
  empSearchText = signal<string>('');
  appliedEmpDept = signal<string>('');
  appliedEmpSearchText = signal<string>('');
  empOverrides = signal<EmpHeadOverride[]>([]);
  isEmpOverrideLoading = this.loadingService.loading('emp-overrides');

  // Emp override modal
  empModalOpen = signal<boolean>(false);
  empModalEmp = signal<DeptEmployee | null>(null);
  empModalRows = signal<EmpOverrideFormRow[]>([]);
  empModalReason = signal<string>('');
  isSavingEmp = signal<boolean>(false);

  // Override table filters
  overrideCompanyFilter = signal<string>('');
  overrideDeptFilter = signal<string>('');
  overrideSearchText = signal<string>('');
  appliedOverrideCompany = signal<string>('');
  appliedOverrideDept = signal<string>('');
  appliedOverrideSearch = signal<string>('');

  // Override modal
  overrideModalOpen = signal<boolean>(false);

  // Help modal
  helpModalOpen = signal<boolean>(false);

  // Bulk emp override
  selectedEmpCodes = signal<Set<string>>(new Set());
  bulkModalOpen = signal<boolean>(false);
  bulkModalRows = signal<EmpOverrideFormRow[]>([]);
  bulkModalReason = signal<string>('');
  isSavingBulk = signal<boolean>(false);
  bulkPendingDeleteLevels = signal<number[]>([]);

  // ==================== LIST TAB COMPUTEDS ====================

  companyList = computed(() => {
    const map = new Map<string, string>();
    this.items().forEach((d) => map.set(d.company_code, d.company_name));
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  });

  deptList = computed(() => {
    const company = this.filterCompany();
    return this.items()
      .filter((d) => !company || d.company_code === company)
      .map((d) => ({ cost_cent: d.cost_cent, name: d.name_cost_cent }));
  });

  filteredItems = computed(() => {
    const text = this.appliedText().toLowerCase().trim();
    const company = this.appliedCompany();
    const dept = this.appliedDept();
    return this.items().filter((d) => {
      const matchText =
        !text ||
        d.employees.some(
          (e) =>
            e.emp_name.toLowerCase().includes(text) ||
            e.emp_code.toLowerCase().includes(text) ||
            (e.nickname ?? '').toLowerCase().includes(text),
        );
      const matchCompany = !company || d.company_code === company;
      const matchDept = !dept || d.cost_cent === dept;
      return matchText && matchCompany && matchDept;
    });
  });

  totalItems = computed(() => this.filteredItems().length);

  paginatedItems = computed(() => {
    const start = this.currentPage() * this.pageSize();
    return this.filteredItems().slice(start, start + this.pageSize());
  });

  modalEmployees = computed(() => {
    const dept = this.selectedDept();
    if (!dept) return [];
    const text = this.appliedText().toLowerCase().trim();
    if (!text) return dept.employees;
    return dept.employees.filter(
      (e) =>
        e.emp_name.toLowerCase().includes(text) ||
        e.emp_code.toLowerCase().includes(text) ||
        (e.nickname ?? '').toLowerCase().includes(text),
    );
  });

  // ==================== OVERRIDE TAB COMPUTEDS ====================

  formDeptList = computed(() => {
    const company = this.formCompanyFilter();
    return this.items()
      .filter((d) => !company || d.company_code === company)
      .map((d) => ({ cost_cent: d.cost_cent, name: d.name_cost_cent }));
  });

  empDeptList = computed(() => {
    const company = this.empCompanyFilter();
    return this.items()
      .filter((d) => !company || d.company_code === company)
      .map((d) => ({ cost_cent: d.cost_cent, name: d.name_cost_cent }));
  });

  formEmployees = computed(() => {
    const map = new Map<string, DeptEmployee>();
    for (const dept of this.items()) {
      for (const emp of dept.employees) {
        if (!map.has(emp.emp_code)) map.set(emp.emp_code, emp);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.emp_name.localeCompare(b.emp_name, 'th'));
  });

  isEditingOverride = computed(
    () =>
      this.formDeptCode() !== '' &&
      this.overrides().some((o) => o.cost_cent === this.formDeptCode()),
  );

  overrideFilterDeptList = computed(() => {
    const company = this.overrideCompanyFilter();
    return this.items()
      .filter((d) => !company || d.company_code === company)
      .map((d) => ({ cost_cent: d.cost_cent, name: d.name_cost_cent }));
  });

  groupedOverrides = computed<OverrideGroup[]>(() => {
    const map = new Map<string, OverrideGroup>();
    for (const o of this.overrides()) {
      if (!map.has(o.cost_cent)) {
        map.set(o.cost_cent, {
          cost_cent: o.cost_cent,
          name_cost_cent:
            this.items().find((d) => d.cost_cent === o.cost_cent)?.name_cost_cent ?? o.cost_cent,
          rows: [],
        });
      }
      map.get(o.cost_cent)!.rows.push(o);
    }
    for (const group of map.values()) {
      group.rows.sort((a, b) => a.level - b.level);
    }

    const company = this.appliedOverrideCompany();
    const dept = this.appliedOverrideDept();
    const search = this.appliedOverrideSearch().toLowerCase().trim();

    return Array.from(map.values()).filter((group) => {
      const deptItem = this.items().find((d) => d.cost_cent === group.cost_cent);
      const matchCompany = !company || deptItem?.company_code === company;
      const matchDept = !dept || group.cost_cent === dept;
      const matchSearch =
        !search ||
        group.name_cost_cent.toLowerCase().includes(search) ||
        group.rows.some(
          (r) =>
            r.emp_name.toLowerCase().includes(search) ||
            r.codeempid.toLowerCase().includes(search),
        );
      return matchCompany && matchDept && matchSearch;
    });
  });

  totalOverrideDepts = computed(() => this.groupedOverrides().length);

  // ==================== EMP OVERRIDE COMPUTEDS ====================

  empDisplayEmployees = computed(() => {
    const dept = this.appliedEmpDept();
    if (!dept) return [];
    const deptData = this.items().find((d) => d.cost_cent === dept);
    if (!deptData) return [];
    const text = this.appliedEmpSearchText().toLowerCase().trim();
    if (!text) return deptData.employees;
    return deptData.employees.filter(
      (e) =>
        e.emp_name.toLowerCase().includes(text) ||
        e.emp_code.toLowerCase().includes(text) ||
        (e.nickname ?? '').toLowerCase().includes(text),
    );
  });

  totalEmpOverrideEmps = computed(() => {
    const codes = new Set(this.empOverrides().map((o) => o.employee_codeempid));
    return codes.size;
  });

  isEmpEditing = computed(() => {
    const emp = this.empModalEmp();
    if (!emp) return false;
    return this.empOverrides().some((o) => o.employee_codeempid === emp.emp_code);
  });

  selectedCount = computed(() => this.selectedEmpCodes().size);

  isAllSelected = computed(() => {
    const displayed = this.empDisplayEmployees();
    if (displayed.length === 0) return false;
    const selected = this.selectedEmpCodes();
    return displayed.every((e) => selected.has(e.emp_code));
  });

  isPartiallySelected = computed(() => {
    const displayed = this.empDisplayEmployees();
    if (displayed.length === 0) return false;
    const selected = this.selectedEmpCodes();
    const count = displayed.filter((e) => selected.has(e.emp_code)).length;
    return count > 0 && count < displayed.length;
  });

  selectedEmployees = computed(() =>
    this.empDisplayEmployees().filter((e) => this.selectedEmpCodes().has(e.emp_code)),
  );

  // ==================== LIFECYCLE ====================

  ngOnInit() {
    this.loadData();
    this.loadOverrides();
    this.loadEmpOverrides();
  }

  loadData() {
    this.loadingService.start('dept-heads');
    this.settingService.getDeptHeads().subscribe({
      next: (res) => {
        console.log(res);
        this.items.set(res.data ?? []);
        this.loadingService.stop('dept-heads');
      },
      error: () => this.loadingService.stop('dept-heads'),
    });
  }

  loadOverrides() {
    this.loadingService.start('dept-overrides');
    this.settingService.getDeptHeadOverrides().subscribe({
      next: (res) => {
        this.overrides.set(res.data ?? []);
        this.loadingService.stop('dept-overrides');
      },
      error: () => this.loadingService.stop('dept-overrides'),
    });
  }

  loadEmpOverrides() {
    this.loadingService.start('emp-overrides');
    this.settingService.getEmpHeadOverrides().subscribe({
      next: (res) => {
        this.empOverrides.set(res.data ?? []);
        this.loadingService.stop('emp-overrides');
      },
      error: () => this.loadingService.stop('emp-overrides'),
    });
  }

  // ==================== LIST TAB METHODS ====================

  setTab(tab: 'list' | 'override' | 'emp-override') {
    this.activeTab.set(tab);
  }

  openHelp() {
    this.helpModalOpen.set(true);
  }

  closeHelp() {
    this.helpModalOpen.set(false);
  }

  onCompanyChange(value: string) {
    this.filterCompany.set(value);
    this.filterDept.set('');
  }

  applyFilter() {
    this.appliedText.set(this.filterText());
    this.appliedCompany.set(this.filterCompany());
    this.appliedDept.set(this.filterDept());
    this.currentPage.set(0);
  }

  clearFilter() {
    this.filterText.set('');
    this.filterCompany.set('');
    this.filterDept.set('');
    this.appliedText.set('');
    this.appliedCompany.set('');
    this.appliedDept.set('');
    this.currentPage.set(0);
  }

  goToPage(page: number) {
    this.currentPage.set(page);
  }

  setPageSize(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(0);
  }

  getMatchingEmployees(dept: DeptHeadItem): DeptEmployee[] {
    const text = this.appliedText().toLowerCase().trim();
    if (!text) return [];
    return dept.employees.filter(
      (e) =>
        e.emp_name.toLowerCase().includes(text) ||
        e.emp_code.toLowerCase().includes(text) ||
        (e.nickname ?? '').toLowerCase().includes(text),
    );
  }

  openDetail(dept: DeptHeadItem) {
    this.selectedDept.set(dept);
  }

  closeDetail() {
    this.selectedDept.set(null);
  }

  sortedHeads(heads: DeptHeadPerson[]): DeptHeadPerson[] {
    return [...heads].sort((a, b) => b.level - a.level);
  }

  getHeadByLevel(heads: DeptHeadPerson[], level: number): DeptHeadPerson | undefined {
    return heads.find((h) => h.level === level);
  }

  getLevelLabel(level: number): string {
    return `ระดับ ${level}`;
  }

  // ==================== OVERRIDE FILTER METHODS ====================

  onOverrideCompanyChange(value: string) {
    this.overrideCompanyFilter.set(value);
    this.overrideDeptFilter.set('');
  }

  applyOverrideFilter() {
    this.appliedOverrideCompany.set(this.overrideCompanyFilter());
    this.appliedOverrideDept.set(this.overrideDeptFilter());
    this.appliedOverrideSearch.set(this.overrideSearchText());
  }

  clearOverrideFilter() {
    this.overrideCompanyFilter.set('');
    this.overrideDeptFilter.set('');
    this.overrideSearchText.set('');
    this.appliedOverrideCompany.set('');
    this.appliedOverrideDept.set('');
    this.appliedOverrideSearch.set('');
  }

  // ==================== OVERRIDE MODAL METHODS ====================

  openOverrideModal() {
    this.resetForm();
    this.overrideModalOpen.set(true);
  }

  closeOverrideModal() {
    this.overrideModalOpen.set(false);
    this.resetForm();
  }

  // ==================== OVERRIDE FORM METHODS ====================

  onFormCompanyChange(value: string) {
    this.formCompanyFilter.set(value);
    this.formDeptCode.set('');
    this.formRows.set([]);
    this.formReason.set('');
  }

  onFormDeptChange(code: string) {
    this.formDeptCode.set(code);
    this.formReason.set('');
    if (!code) {
      this.formRows.set([]);
      return;
    }
    const existing = this.overrides()
      .filter((o) => o.cost_cent === code)
      .sort((a, b) => a.level - b.level);
    if (existing.length > 0) {
      this.formRows.set(
        existing.map((o) => ({ level: o.level, empCode: o.codeempid, isExisting: true })),
      );
      this.formReason.set(existing[0].reason ?? '');
    } else {
      this.formRows.set([{ level: 1, empCode: '', isExisting: false }]);
    }
  }

  addFormRow() {
    const rows = this.formRows();
    const maxLevel = rows.length > 0 ? Math.max(...rows.map((r) => r.level)) : 0;
    this.formRows.update((rows) => [
      ...rows,
      { level: maxLevel + 1, empCode: '', isExisting: false },
    ]);
  }

  updateRowEmp(index: number, empCode: string) {
    this.formRows.update((rows) => rows.map((r, i) => (i === index ? { ...r, empCode } : r)));
  }

  getAvailableEmployees(rowIndex: number) {
    const selectedCodes = this.formRows()
      .filter((_, i) => i !== rowIndex)
      .map((r) => r.empCode)
      .filter(Boolean);
    return this.formEmployees().filter((e) => !selectedCodes.includes(e.emp_code));
  }

  getAvailableHeadsForEmpModal(rowIndex: number) {
    const selectedCodes = this.empModalRows()
      .filter((_, i) => i !== rowIndex)
      .map((r) => r.headCode)
      .filter(Boolean);
    return this.formEmployees().filter((e) => !selectedCodes.includes(e.emp_code));
  }

  getAvailableHeadsForBulkModal(rowIndex: number) {
    const selectedCodes = this.bulkModalRows()
      .filter((_, i) => i !== rowIndex)
      .map((r) => r.headCode)
      .filter(Boolean);
    return this.formEmployees().filter((e) => !selectedCodes.includes(e.emp_code));
  }

  async removeFormRow(index: number) {
    const row = this.formRows()[index];
    if (row.isExisting && this.formDeptCode()) {
      const result = await this.swalService.confirm(
        'ยืนยันการลบ',
        `ต้องการลบ override ระดับ ${row.level} ของแผนกนี้ใช่หรือไม่?`,
      );
      if (!result.isConfirmed) return;

      this.settingService.deleteDeptHeadOverride(this.formDeptCode(), row.level).subscribe({
        next: () => {
          this.formRows.update((rows) => rows.filter((_, i) => i !== index));
          this.loadOverrides();
          this.loadData();
        },
        error: () => this.swalService.error('เกิดข้อผิดพลาด', 'ไม่สามารถลบ override ได้'),
      });
    } else {
      this.formRows.update((rows) => rows.filter((_, i) => i !== index));
    }
  }

  saveOverride() {
    const rows = this.formRows().filter((r) => r.empCode !== '');
    if (!this.formDeptCode() || rows.length === 0) {
      this.swalService.warning('กรุณากรอกข้อมูลให้ครบ', 'โปรดเลือกแผนกและพนักงานอย่างน้อย 1 ระดับ');
      return;
    }
    const codes = rows.map((r) => r.empCode);
    if (new Set(codes).size !== codes.length) {
      this.swalService.warning('ข้อมูลซ้ำ', 'ชื่อหัวหน้าแต่ละระดับต้องไม่ซ้ำกัน');
      return;
    }

    const createdBy = this.authService.userData()?.codeempid;
    const requests = rows.map((row) => {
      const payload: Record<string, any> = {
        costCent: this.formDeptCode(),
        level: row.level,
        codeempid: row.empCode,
      };
      if (this.formReason()) payload['reason'] = this.formReason();
      if (createdBy) payload['createdBy'] = createdBy;
      return this.settingService.saveDeptHeadOverride(payload as any);
    });

    this.isSaving.set(true);
    forkJoin(requests).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.swalService.success(
          'บันทึกสำเร็จ',
          `บันทึก override ${rows.length} ระดับ เรียบร้อยแล้ว`,
        );
        this.closeOverrideModal();
        this.loadOverrides();
        this.loadData();
      },
      error: () => {
        this.isSaving.set(false);
        this.swalService.error('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึก override บางรายการได้');
      },
    });
  }

  resetForm() {
    this.formCompanyFilter.set('');
    this.formDeptCode.set('');
    this.formRows.set([]);
    this.formReason.set('');
  }

  // ==================== OVERRIDE TABLE METHODS ====================

  editDeptOverride(costCent: string) {
    const existing = this.overrides()
      .filter((o) => o.cost_cent === costCent)
      .sort((a, b) => a.level - b.level);
    const deptItem = this.items().find((d) => d.cost_cent === costCent);
    if (deptItem) this.formCompanyFilter.set(deptItem.company_code);
    this.formDeptCode.set(costCent);
    this.formReason.set(existing[0]?.reason ?? '');
    this.formRows.set(
      existing.map((o) => ({ level: o.level, empCode: o.codeempid, isExisting: true })),
    );
    this.overrideModalOpen.set(true);
  }

  async deleteOverrideLevel(override: DeptHeadOverride, deptName: string) {
    const result = await this.swalService.confirm(
      'ยืนยันการลบ',
      `ต้องการลบ override ระดับ ${override.level} ของแผนก "${deptName}" ใช่หรือไม่?`,
    );
    if (!result.isConfirmed) return;

    this.settingService.deleteDeptHeadOverride(override.cost_cent, override.level).subscribe({
      next: () => {
        this.swalService.success('ลบสำเร็จ', `Override ระดับ ${override.level} ถูกลบแล้ว`);
        this.loadOverrides();
        this.loadData();
      },
      error: () => this.swalService.error('เกิดข้อผิดพลาด', 'ไม่สามารถลบ override ได้'),
    });
  }

  async deleteAllOverrides(costCent: string, deptName: string) {
    const result = await this.swalService.confirm(
      'ยืนยันการลบทั้งหมด',
      `ต้องการลบ override ทุกระดับ ของแผนก "${deptName}" และคืนค่าหัวหน้าแผนกเป็น default จาก HRMS ใช่หรือไม่?`,
    );
    if (!result.isConfirmed) return;

    this.settingService.deleteDeptHeadOverride(costCent).subscribe({
      next: () => {
        this.swalService.success(
          'ลบสำเร็จ',
          'Override ทุกระดับถูกลบแล้ว หัวหน้าแผนกจะใช้ค่า default จาก HRMS',
        );
        if (this.formDeptCode() === costCent) this.resetForm();
        this.loadOverrides();
        this.loadData();
      },
      error: () => this.swalService.error('เกิดข้อผิดพลาด', 'ไม่สามารถลบ override ได้'),
    });
  }

  // ==================== EMP OVERRIDE METHODS ====================

  onEmpCompanyChange(value: string) {
    this.empCompanyFilter.set(value);
    this.empDeptFilter.set('');
  }

  onEmpDeptFilterChange(code: string) {
    this.empDeptFilter.set(code);
  }

  applyEmpFilter() {
    this.appliedEmpDept.set(this.empDeptFilter());
    this.appliedEmpSearchText.set(this.empSearchText());
    this.selectedEmpCodes.set(new Set());
  }

  clearEmpFilter() {
    this.empCompanyFilter.set('');
    this.empDeptFilter.set('');
    this.empSearchText.set('');
    this.appliedEmpDept.set('');
    this.appliedEmpSearchText.set('');
    this.selectedEmpCodes.set(new Set());
  }

  getEmpOverridesForEmp(empCode: string): EmpHeadOverride[] {
    return this.empOverrides()
      .filter((o) => o.employee_codeempid === empCode)
      .sort((a, b) => a.level - b.level);
  }

  getEmpOverrideByLevel(empCode: string, level: number): EmpHeadOverride | undefined {
    return this.empOverrides().find((o) => o.employee_codeempid === empCode && o.level === level);
  }

  getLatestEmpOverride(empCode: string): EmpHeadOverride | undefined {
    const overrides = this.getEmpOverridesForEmp(empCode);
    if (!overrides.length) return undefined;
    return overrides.reduce((latest, cur) =>
      new Date(cur.updated_at) > new Date(latest.updated_at) ? cur : latest,
    );
  }

  openEmpModal(emp: DeptEmployee) {
    const existing = this.getEmpOverridesForEmp(emp.emp_code);
    this.empModalEmp.set(emp);
    if (existing.length > 0) {
      this.empModalRows.set(
        existing.map((o) => ({ level: o.level, headCode: o.head_codeempid, isExisting: true })),
      );
      this.empModalReason.set(existing[0].reason ?? '');
    } else {
      this.empModalRows.set([{ level: 1, headCode: '', isExisting: false }]);
      this.empModalReason.set('');
    }
    this.empModalOpen.set(true);
  }

  closeEmpModal() {
    this.empModalOpen.set(false);
    this.empModalEmp.set(null);
    this.empModalRows.set([]);
    this.empModalReason.set('');
  }

  addEmpModalRow() {
    const rows = this.empModalRows();
    const maxLevel = rows.length > 0 ? Math.max(...rows.map((r) => r.level)) : 0;
    this.empModalRows.update((rows) => [
      ...rows,
      { level: maxLevel + 1, headCode: '', isExisting: false },
    ]);
  }

  updateEmpModalRow(index: number, headCode: string) {
    this.empModalRows.update((rows) => rows.map((r, i) => (i === index ? { ...r, headCode } : r)));
  }

  async removeEmpModalRow(index: number) {
    const rows = this.empModalRows();
    const row = rows[index];
    const emp = this.empModalEmp();
    if (row.isExisting && emp) {
      const result = await this.swalService.confirm(
        'ยืนยันการลบ',
        `ต้องการลบ override ระดับ ${row.level} ของพนักงานนี้ใช่หรือไม่?`,
      );
      if (!result.isConfirmed) return;

      const shiftingExisting = rows.filter((r, i) => i > index && r.isExisting);
      const deleteRequests = [
        this.settingService.deleteEmpHeadOverride(emp.emp_code, row.level),
        ...shiftingExisting.map((r) =>
          this.settingService.deleteEmpHeadOverride(emp.emp_code, r.level),
        ),
      ];

      forkJoin(deleteRequests).subscribe({
        next: () => {
          this.empModalRows.update((currentRows) => {
            const filtered = currentRows.filter((_, i) => i !== index);
            return filtered.map((r, i) => {
              const newLevel = i + 1;
              return r.level !== newLevel ? { ...r, level: newLevel, isExisting: false } : r;
            });
          });
          this.loadEmpOverrides();
        },
        error: () => this.swalService.error('เกิดข้อผิดพลาด', 'ไม่สามารถลบ override ได้'),
      });
    } else {
      this.empModalRows.update((currentRows) => {
        const filtered = currentRows.filter((_, i) => i !== index);
        return filtered.map((r, i) => ({ ...r, level: i + 1 }));
      });
    }
  }

  saveEmpOverride() {
    const rows = this.empModalRows().filter((r) => r.headCode !== '');
    const emp = this.empModalEmp();
    if (!emp || rows.length === 0) {
      this.swalService.warning('กรุณากรอกข้อมูลให้ครบ', 'โปรดเลือกหัวหน้าอย่างน้อย 1 ระดับ');
      return;
    }
    const headCodes = rows.map((r) => r.headCode);
    if (new Set(headCodes).size !== headCodes.length) {
      this.swalService.warning('ข้อมูลซ้ำ', 'ชื่อหัวหน้าแต่ละระดับต้องไม่ซ้ำกัน');
      return;
    }

    const executedBy = this.authService.userData()?.CODEMPID;
    const requests = rows.map((row) => {
      const payload: Record<string, any> = {
        employee_codeempid: emp.emp_code,
        level: row.level,
        head_codeempid: row.headCode,
      };
      if (this.empModalReason()) payload['reason'] = this.empModalReason();
      // if (createdBy) payload['created_by'] = createdBy;

      if (row.isExisting) {
        payload['updated_by'] = executedBy;
      } else {
        payload['created_by'] = executedBy;
      }
      return this.settingService.saveEmpHeadOverride(payload as any);
    });

    this.isSavingEmp.set(true);
    forkJoin(requests).subscribe({
      next: () => {
        this.isSavingEmp.set(false);
        this.swalService.success(
          'บันทึกสำเร็จ',
          `บันทึก override ${rows.length} ระดับ เรียบร้อยแล้ว`,
        );
        this.closeEmpModal();
        this.loadEmpOverrides();
      },
      error: () => {
        this.isSavingEmp.set(false);
        this.swalService.error('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึก override บางรายการได้');
      },
    });
  }

  isEmpSelected(empCode: string): boolean {
    return this.selectedEmpCodes().has(empCode);
  }

  toggleEmpSelection(empCode: string) {
    const current = new Set(this.selectedEmpCodes());
    if (current.has(empCode)) current.delete(empCode);
    else current.add(empCode);
    this.selectedEmpCodes.set(current);
  }

  toggleAllSelection() {
    if (this.isAllSelected()) {
      this.selectedEmpCodes.set(new Set());
    } else {
      this.selectedEmpCodes.set(new Set(this.empDisplayEmployees().map((e) => e.emp_code)));
    }
  }

  clearSelection() {
    this.selectedEmpCodes.set(new Set());
  }

  openBulkModal() {
    const empCodes = Array.from(this.selectedEmpCodes());
    const allOverrides = this.empOverrides().filter((o) => empCodes.includes(o.employee_codeempid));

    if (allOverrides.length === 0) {
      this.bulkModalRows.set([{ level: 1, headCode: '', isExisting: false }]);
      this.bulkModalReason.set('');
    } else {
      const levelSet = new Set(allOverrides.map((o) => o.level));
      const levels = Array.from(levelSet).sort((a, b) => a - b);

      const rows: EmpOverrideFormRow[] = levels.map((level) => {
        const overridesForLevel = allOverrides.filter((o) => o.level === level);
        const empsWithLevel = new Set(overridesForLevel.map((o) => o.employee_codeempid));
        const allHaveLevel = empCodes.every((c) => empsWithLevel.has(c));
        const uniqueHeads = new Set(overridesForLevel.map((o) => o.head_codeempid));
        const allAgree = allHaveLevel && uniqueHeads.size === 1;

        const overrideByEmp = new Map(overridesForLevel.map((o) => [o.employee_codeempid, o]));
        const mixedEntries: MixedEntry[] | undefined = allAgree
          ? undefined
          : empCodes.map((code) => {
              const ov = overrideByEmp.get(code);
              const emp = this.selectedEmployees().find((e) => e.emp_code === code);
              const empName = emp
                ? emp.emp_name + (emp.nickname ? ` (${emp.nickname})` : '')
                : code;
              const headName = ov
                ? ov.head_name + (ov.head_nickname ? ` (${ov.head_nickname})` : '')
                : null;
              return { empName, headName };
            });

        return {
          level,
          headCode: allAgree ? overridesForLevel[0].head_codeempid : '',
          isExisting: true,
          isMixed: !allAgree,
          mixedEntries,
        };
      });

      this.bulkModalRows.set(rows);

      const reasons = [...new Set(allOverrides.map((o) => o.reason).filter(Boolean))];
      this.bulkModalReason.set(reasons.length === 1 ? reasons[0] : '');
    }

    this.bulkPendingDeleteLevels.set([]);
    this.bulkModalOpen.set(true);
  }

  closeBulkModal() {
    this.bulkModalOpen.set(false);
    this.bulkModalRows.set([]);
    this.bulkModalReason.set('');
    this.bulkPendingDeleteLevels.set([]);
  }

  addBulkModalRow() {
    const rows = this.bulkModalRows();
    const maxLevel = rows.length > 0 ? Math.max(...rows.map((r) => r.level)) : 0;
    this.bulkModalRows.update((rows) => [
      ...rows,
      { level: maxLevel + 1, headCode: '', isExisting: false },
    ]);
  }

  updateBulkModalRow(index: number, headCode: string) {
    this.bulkModalRows.update((rows) => rows.map((r, i) => (i === index ? { ...r, headCode } : r)));
  }

  removeBulkModalRow(index: number) {
    const rows = this.bulkModalRows();
    const row = rows[index];

    const levelsToDelete: number[] = [];
    if (row?.isExisting) {
      levelsToDelete.push(row.level);
    }

    const remaining = rows.filter((_, i) => i !== index);
    const renumbered = remaining.map((r, i) => {
      const newLevel = i + 1;
      if (r.isExisting && r.level !== newLevel) {
        levelsToDelete.push(r.level);
        return { ...r, level: newLevel, isExisting: false };
      }
      return { ...r, level: newLevel };
    });

    this.bulkPendingDeleteLevels.update((levels) => [...levels, ...levelsToDelete]);
    this.bulkModalRows.set(renumbered);
  }

  saveBulkOverride() {
    const rows = this.bulkModalRows().filter((r) => r.headCode !== '');
    const deleteLevels = this.bulkPendingDeleteLevels();
    const empCodes = Array.from(this.selectedEmpCodes());
    if (empCodes.length === 0 || (rows.length === 0 && deleteLevels.length === 0)) {
      this.swalService.warning('กรุณากรอกข้อมูลให้ครบ', 'โปรดเลือกหัวหน้าอย่างน้อย 1 ระดับ');
      return;
    }
    const headCodes = rows.map((r) => r.headCode);
    if (new Set(headCodes).size !== headCodes.length) {
      this.swalService.warning('ข้อมูลซ้ำ', 'ชื่อหัวหน้าแต่ละระดับต้องไม่ซ้ำกัน');
      return;
    }

    const executedBy = this.authService.userData()?.CODEMPID;

    const saveRequests = empCodes.flatMap((empCode) =>
      rows.map((row) => {
        const payload: Record<string, any> = {
          employee_codeempid: empCode,
          level: row.level,
          head_codeempid: row.headCode,
        };
        if (this.bulkModalReason()) payload['reason'] = this.bulkModalReason();
        payload[row.isExisting ? 'updated_by' : 'created_by'] = executedBy;
        return this.settingService.saveEmpHeadOverride(payload as any);
      }),
    );

    const deleteRequests = empCodes.flatMap((empCode) =>
      deleteLevels
        .filter((level) => !!this.getEmpOverrideByLevel(empCode, level))
        .map((level) => this.settingService.deleteEmpHeadOverride(empCode, level)),
    );

    this.isSavingBulk.set(true);
    forkJoin([...saveRequests, ...deleteRequests]).subscribe({
      next: () => {
        this.isSavingBulk.set(false);
        this.swalService.success(
          'บันทึกสำเร็จ',
          `บันทึก override ให้ ${empCodes.length} คน เรียบร้อยแล้ว`,
        );
        this.closeBulkModal();
        this.clearSelection();
        this.loadEmpOverrides();
      },
      error: () => {
        this.isSavingBulk.set(false);
        this.swalService.error('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกหรือลบ override บางรายการได้');
      },
    });
  }

  async deleteEmpAllOverrides(emp: DeptEmployee) {
    const result = await this.swalService.confirm(
      'ยืนยันการลบทั้งหมด',
      `ต้องการลบ override ทุกระดับของ "${emp.emp_name}" และคืนค่าหัวหน้าเป็น default ใช่หรือไม่?`,
    );
    if (!result.isConfirmed) return;

    this.settingService.deleteEmpHeadOverride(emp.emp_code).subscribe({
      next: () => {
        this.swalService.success('ลบสำเร็จ', 'Override ทุกระดับถูกลบแล้ว');
        this.loadEmpOverrides();
      },
      error: () => this.swalService.error('เกิดข้อผิดพลาด', 'ไม่สามารถลบ override ได้'),
    });
  }
}
