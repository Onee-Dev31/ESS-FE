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
  activeTab = signal<'list' | 'override'>('list');

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
  formDeptCode = signal<string>('');
  formRows = signal<FormRow[]>([]);
  formReason = signal<string>('');

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
    return Array.from(map.values());
  });

  totalOverrideDepts = computed(() => this.groupedOverrides().length);

  // ==================== LIFECYCLE ====================

  ngOnInit() {
    this.loadData();
    this.loadOverrides();
  }

  loadData() {
    this.loadingService.start('dept-heads');
    this.settingService.getDeptHeads().subscribe({
      next: (res) => {
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

  // ==================== LIST TAB METHODS ====================

  setTab(tab: 'list' | 'override') {
    this.activeTab.set(tab);
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

  getLevelLabel(level: number): string {
    return `ระดับ ${level}`;
  }

  // ==================== OVERRIDE FORM METHODS ====================

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
        this.resetForm();
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
    this.formDeptCode.set('');
    this.formRows.set([]);
    this.formReason.set('');
  }

  // ==================== OVERRIDE TABLE METHODS ====================

  editDeptOverride(costCent: string) {
    const existing = this.overrides()
      .filter((o) => o.cost_cent === costCent)
      .sort((a, b) => a.level - b.level);
    this.formDeptCode.set(costCent);
    this.formReason.set(existing[0]?.reason ?? '');
    this.formRows.set(
      existing.map((o) => ({ level: o.level, empCode: o.codeempid, isExisting: true })),
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
}
